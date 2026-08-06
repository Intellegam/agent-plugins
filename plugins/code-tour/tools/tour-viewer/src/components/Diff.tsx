/**
 * A source-true diff reference rendered by @pierre/diffs. The authored page names only a
 * file and hunk/range from pr.diff; comments use Pierre's native inline annotation rows.
 */

import {
  Children,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  PatchDiff,
  type DiffLineAnnotation,
  type SelectedLineRange,
} from "@pierre/diffs/react";

import {
  changedLineKey,
  changedLines,
  changeAt,
  countHunk,
  patchFor,
  resolveRef,
  type LineRange,
  type Side,
} from "../diff.ts";
import type { ReviewComment } from "../review.ts";
import { recordCoverage, recordFailure } from "../failures.ts";
import { Annotation, type AnnotationProps } from "./Annotation.tsx";
import { Chevron } from "./Section.tsx";
import { ChangeBadge } from "./Stats.tsx";
import { DiffContext, DiffViewContext, ReviewContext, ViewedContext } from "./context.ts";

export interface DiffProps {
  file: string;
  hunk?: number;
  lines?: LineRange;
  /** Ship the diff folded (for low-signal hunks: tests, lockfiles, renames). A click expands. */
  collapsed?: boolean;
  children?: ReactNode;
}

type ReviewAnnotation =
  | { kind: "ai"; content: ReactNode }
  | { kind: "comment"; comment: ReviewComment }
  | { kind: "composer" };

// Pierre mounts the comment trigger's slot inside the hovered line's number cell, anchored on
// top of the right-aligned number — half-covering it. The cell lives in the <diffs-container>
// shadow root, out of reach of document CSS, so this sheet is appended to the container's
// adoptedStyleSheets: hide the number while the trigger is mounted and center the trigger over
// the cell (the button replaces the number, GitHub-style). Pierre's own sheet sits in
// `@layer base`, so these unlayered rules win.
let gutterFixSheet: CSSStyleSheet | null = null;

function gutterUtilityFix(): CSSStyleSheet {
  if (gutterFixSheet == null) {
    gutterFixSheet = new CSSStyleSheet();
    gutterFixSheet.replaceSync(
      `[data-column-number]:has([data-gutter-utility-slot]) [data-line-number-content] { visibility: hidden; }
       [data-gutter-utility-slot] { left: 0; justify-content: center; }`,
    );
  }
  return gutterFixSheet;
}

/** Neutral person silhouette for the reader's comment cards — no text squeezed into a circle. */
function PersonAvatar() {
  return (
    <span className="tour-avatar" aria-hidden="true">
      <svg viewBox="0 0 16 16">
        <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 1.5c-2.76 0-5 1.57-5 3.5v.75h10V13c0-1.93-2.24-3.5-5-3.5Z" />
      </svg>
    </span>
  );
}

/** The write surface shared by the new-comment composer and the edit form of a saved comment. */
function CommentEditor({
  title,
  value,
  saveLabel,
  onChange,
  onSave,
  onCancel,
}: {
  title: string;
  value: string;
  saveLabel: string;
  onChange(next: string): void;
  onSave(): void;
  onCancel(): void;
}) {
  return (
    <div className="tour-comment-composer">
      <div className="tour-comment-head"><PersonAvatar /><strong>{title}</strong></div>
      <textarea
        autoFocus
        value={value}
        placeholder="What should change here?"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSave();
        }}
      />
      <div className="tour-composer-actions">
        <span>⌘ Enter to save</span>
        <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={!value.trim()} onClick={onSave}>{saveLabel}</button>
      </div>
    </div>
  );
}

function annotationsFrom(children: ReactNode): AnnotationProps[] {
  const out: AnnotationProps[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === Annotation) {
      out.push((child as ReactElement<AnnotationProps>).props);
    }
  });
  return out;
}

export function Diff({ file, hunk, lines, collapsed: initialCollapsed = false, children }: DiffProps) {
  const files = useContext(DiffContext);
  const review = useContext(ReviewContext);
  const viewPref = useContext(DiffViewContext);
  const viewedCtx = useContext(ViewedContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [selection, setSelection] = useState<SelectedLineRange | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const resolved = files ? resolveRef(files, file, { hunk, lines }) : null;

  // The reference props are a stable identity within a tour: the viewed-persistence key and the
  // DOM id navigation jumps target.
  const refId = `${file}${hunk !== undefined ? `#hunk${hunk}` : lines ? `#${lines.side}:${lines.start}-${lines.end}` : ""}`;
  const domId = `diff-${refId.replace(/[^A-Za-z0-9_.-]+/g, "-")}`;
  const viewed = viewedCtx?.viewed.includes(refId) ?? false;

  // GitHub parity: checking "Viewed" folds the diff away, unchecking unfolds it — including the
  // initial fold when a previously viewed tour loads from storage. Only viewed CHANGES sync
  // (an author's `collapsed` must survive the mount run), and the chevron stays free to peek
  // into a viewed diff without unchecking it.
  const prevViewed = useRef(viewed);
  useEffect(() => {
    if (prevViewed.current === viewed) return;
    prevViewed.current = viewed;
    setCollapsed(viewed);
  }, [viewed]);

  // A navigation jump must land on visible code: expand when it targets this diff.
  useEffect(() => {
    const onNavigate = (event: Event) => {
      if ((event as CustomEvent<string>).detail === domId) setCollapsed(false);
    };
    window.addEventListener("tour-navigate", onNavigate);
    return () => window.removeEventListener("tour-navigate", onNavigate);
  }, [domId]);

  // Bulk fold/unfold from the nav's "collapse/expand all" button (detail: true = collapse).
  // Only touches the visual fold, never the "viewed" state.
  useEffect(() => {
    const onSetAll = (event: Event) => setCollapsed(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("tour-diffs-collapse", onSetAll);
    return () => window.removeEventListener("tour-diffs-collapse", onSetAll);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setContainerWidth(width));
    });
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // The container upgrades synchronously on insert (FileDiff imports web-components.js), so
    // its open shadow root exists by now; the element survives view-type changes unchanged.
    const shadow = containerRef.current?.querySelector("diffs-container")?.shadowRoot;
    if (!shadow) return;
    const sheet = gutterUtilityFix();
    if (!shadow.adoptedStyleSheets.includes(sheet)) {
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];
    }
  }, []);

  if (!resolved || !resolved.ok) {
    if (resolved && !resolved.ok) recordFailure(resolved.error);
    return (
      <div className="tour-diff tour-diff-broken">
        <p className="tour-diff-broken-msg">
          Unresolved diff reference: <code>{file}</code>
          {hunk !== undefined ? ` hunk ${hunk}` : lines ? ` ${lines.side} ${lines.start}–${lines.end}` : ""}
        </p>
      </div>
    );
  }

  // The shared column preference lives in the provider; a narrow container still forces
  // unified locally without touching the global choice.
  const narrow = containerWidth > 0 && containerWidth < 680;
  const viewType = narrow ? "unified" : viewPref?.view ?? "split";
  const patch = patchFor(resolved.file, resolved.hunk);
  // Changed lines in the shown slice — surfaced as a header badge and as data attributes the
  // nav/section aggregators sum up (they can't re-derive this from the DOM Pierre renders).
  const counts = countHunk(resolved.hunk);
  recordCoverage(changedLines(resolved.file, resolved.hunk).map(changedLineKey));
  const authored = annotationsFrom(children);
  // Build guarantee (parity with broken <Diff> refs): an <Annotation> whose line is not a shown
  // line of this hunk renders nothing — catch it at build time instead of letting it vanish.
  // recordFailure is a no-op unless the build armed it, so browser re-renders never touch this.
  for (const annotation of authored) {
    if (!changeAt(resolved.hunk, annotation.side, annotation.line)) {
      recordFailure(
        `${file}: annotation on ${annotation.side} line ${annotation.line} is not a shown line in this <Diff> — it would not render`,
      );
    }
  }
  const comments = review?.comments.filter(
    (comment) =>
      comment.anchor.path === file &&
      Boolean(changeAt(resolved.hunk, comment.anchor.side, comment.anchor.line)),
  ) ?? [];

  const lineAnnotations = useMemo<DiffLineAnnotation<ReviewAnnotation>[]>(() => {
    const result: DiffLineAnnotation<ReviewAnnotation>[] = [];
    for (const annotation of authored) {
      if (!changeAt(resolved.hunk, annotation.side, annotation.line)) continue;
      result.push({
        lineNumber: annotation.line,
        side: pierreSide(annotation.side),
        metadata: { kind: "ai", content: annotation.children },
      });
    }
    for (const comment of comments) {
      result.push({
        lineNumber: comment.anchor.line,
        side: pierreSide(comment.anchor.side),
        metadata: { kind: "comment", comment },
      });
    }
    if (selection) {
      result.push({
        lineNumber: selection.end,
        side: selection.endSide ?? selection.side ?? "additions",
        metadata: { kind: "composer" },
      });
    }
    return result;
  }, [authored, comments, resolved.hunk, selection]);

  const addComment = () => {
    const body = draft.trim();
    if (!body || !selection || !review) return;
    const endSide = reviewSide(selection.endSide ?? selection.side ?? "additions");
    const startSide = reviewSide(selection.side ?? "additions");
    const sameSide = endSide === startSide;
    const startLine = sameSide ? Math.min(selection.start, selection.end) : selection.start;
    const endLine = sameSide ? Math.max(selection.start, selection.end) : selection.end;
    review.addComment({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      anchor: {
        path: file,
        side: endSide,
        line: endLine,
        ...(startLine !== endLine || startSide !== endSide ? { startLine, startSide } : {}),
      },
      body,
      author: "user",
      createdAt: new Date().toISOString(),
    });
    setDraft("");
    setSelection(null);
  };

  const saveEdit = () => {
    const body = editing?.draft.trim();
    if (!body || !editing || !review) return;
    review.updateComment(editing.id, body);
    setEditing(null);
  };

  const renderCard = (metadata: ReviewAnnotation) => {
    if (metadata.kind === "ai") {
      return (
        <div className="tour-comment tour-comment-ai">
          <div className="tour-comment-head"><span className="tour-avatar tour-avatar-ai">AI</span><strong>Code tour</strong><span>explanation</span></div>
          <div className="tour-comment-body">{metadata.content}</div>
        </div>
      );
    }
    if (metadata.kind === "comment") {
      const comment = metadata.comment;
      if (editing?.id === comment.id) {
        return (
          <CommentEditor
            title="Edit review comment"
            value={editing.draft}
            saveLabel="Save"
            onChange={(next) => setEditing({ id: comment.id, draft: next })}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          />
        );
      }
      return (
        <div className="tour-comment">
          <div className="tour-comment-head"><PersonAvatar /><strong>Your review</strong></div>
          <div className="tour-comment-body">{comment.body}</div>
          <div className="tour-comment-actions">
            <button type="button" onClick={() => setEditing({ id: comment.id, draft: comment.body })}>Edit</button>
            <button type="button" className="danger" onClick={() => review?.removeComment(comment.id)}>Delete</button>
          </div>
        </div>
      );
    }
    return (
      <CommentEditor
        title="Add review comment"
        value={draft}
        saveLabel="Add comment"
        onChange={setDraft}
        onSave={addComment}
        onCancel={() => { setDraft(""); setSelection(null); }}
      />
    );
  };

  return (
    <div
      className="tour-diff"
      id={domId}
      data-tour-diff={refId}
      data-tour-added={counts.added}
      data-tour-removed={counts.removed}
      ref={containerRef}
    >
      <div className="tour-diff-code">
        <div className="tour-diff-file">
          <Chevron
            expanded={!collapsed}
            label={collapsed ? "Expand diff" : "Collapse diff"}
            onClick={() => setCollapsed((current) => !current)}
          />
          <span className="tour-diff-path">{file}</span>
          <ChangeBadge added={counts.added} removed={counts.removed} className="tour-diff-changes" />
          <label className="tour-diff-viewed">
            <input type="checkbox" checked={viewed} onChange={() => viewedCtx?.toggle(refId)} />
            Viewed
          </label>
          <div className="tour-diff-controls" role="group" aria-label="Diff layout">
            <button type="button" className={viewType === "unified" ? "is-active" : ""} aria-pressed={viewType === "unified"} onClick={() => viewPref?.setView("unified")}>1 column</button>
            <button type="button" className={viewType === "split" ? "is-active" : ""} aria-pressed={viewType === "split"} disabled={narrow} title={narrow ? "Split view needs a wider container" : undefined} onClick={() => viewPref?.setView("split")}>2 columns</button>
          </div>
        </div>
        <div hidden={collapsed}>
          <PatchDiff<ReviewAnnotation>
            patch={patch}
            disableWorkerPool
            selectedLines={selection}
            lineAnnotations={lineAnnotations}
            options={{
              controlledSelection: true,
              disableFileHeader: true,
              diffIndicators: "bars",
              diffStyle: viewType,
              enableGutterUtility: true,
              enableLineSelection: true,
              hunkSeparators: "line-info-basic",
              lineDiffType: "word-alt",
              lineHoverHighlight: "both",
              // Long lines soft-wrap instead of scrolling; Pierre's row grid keeps the line
              // number on the first visual line only, so continuations carry no number.
              overflow: "wrap",
              theme: "github-light",
              themeType: "light",
              onLineSelectionEnd: (range) => setSelection(range),
            }}
            renderGutterUtility={(getHoveredLine) => (
              <button
                type="button"
                className="tour-comment-trigger"
                aria-label="Comment on this line"
                onClick={() => {
                  const hovered = getHoveredLine();
                  if (!hovered) return;
                  setSelection({ start: hovered.lineNumber, end: hovered.lineNumber, side: hovered.side });
                }}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M2.5 3.25A1.75 1.75 0 0 1 4.25 1.5h7.5a1.75 1.75 0 0 1 1.75 1.75v5.5a1.75 1.75 0 0 1-1.75 1.75H7L3.2 13.7a.45.45 0 0 1-.7-.35V3.25Z" />
                  <path d="M8 4v4M6 6h4" />
                </svg>
              </button>
            )}
            renderAnnotation={(annotation) => renderCard(annotation.metadata)}
          />
        </div>
      </div>
    </div>
  );
}

function pierreSide(side: Side): "deletions" | "additions" {
  return side === "old" ? "deletions" : "additions";
}

function reviewSide(side: "deletions" | "additions"): Side {
  return side === "deletions" ? "old" : "new";
}
