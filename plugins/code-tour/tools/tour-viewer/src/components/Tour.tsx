/**
 * `<TourProvider>` and `<Tour>`.
 *
 * `<TourProvider diff={rawDiff}>` is wrapped around the tour by the render harness (build,
 * browser entry, tests) — never by the LLM. It parses `pr.diff` once and exposes it through
 * context so `<Diff>` blocks can resolve their references. The LLM never touches diff content.
 *
 * `<Tour title meta>` is the visual page frame: a header plus a table-of-contents nav built
 * client-side from the rendered sections (empty and harmless during server-side rendering).
 */

import {
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { parse } from "../diff.ts";
import {
  claudeReviewPrompt,
  githubReviewCommand,
  type GitHubReviewTarget,
  type ReviewComment,
} from "../review.ts";
import { withFilenameCode } from "./Section.tsx";
import { VictoryOverlay, victorySound } from "./Victory.tsx";
import {
  DiffContext,
  DiffViewContext,
  ReviewContext,
  ViewedContext,
  type DiffView,
} from "./context.ts";

export interface TourProviderProps {
  diff: string;
  children?: ReactNode;
}

const DIFF_VIEW_KEY = "code-tour:diff-view";

export function TourProvider({ diff, children }: TourProviderProps) {
  const files = useMemo(() => parse(diff), [diff]);
  const storageKey = useMemo(() => `code-tour-review:${hash(diff)}`, [diff]);
  const viewedKey = useMemo(() => `code-tour-viewed:${hash(diff)}`, [diff]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [viewedIds, setViewedIds] = useState<string[]>([]);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const [diffView, setDiffView] = useState<DiffView>("split");

  useEffect(() => {
    try {
      const view = localStorage.getItem(DIFF_VIEW_KEY);
      if (view === "unified" || view === "split") setDiffView(view);
      const viewed = localStorage.getItem(viewedKey);
      if (viewed) {
        const parsed = JSON.parse(viewed) as unknown;
        if (Array.isArray(parsed)) setViewedIds(parsed.filter((id) => typeof id === "string"));
      }
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) setComments(parsed as ReviewComment[]);
      }
    } catch {
      // A tour remains fully usable when storage is blocked or contains stale data.
    } finally {
      setStorageLoaded(true);
    }
  }, [storageKey, viewedKey]);

  useEffect(() => {
    if (!storageLoaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(comments));
      localStorage.setItem(viewedKey, JSON.stringify(viewedIds));
    } catch {
      // Persistence is best-effort in private/sandboxed browser contexts.
    }
  }, [comments, viewedIds, storageKey, viewedKey, storageLoaded]);

  const review = useMemo(
    () => ({
      comments,
      addComment: (comment: ReviewComment) => setComments((current) => [...current, comment]),
      removeComment: (id: string) =>
        setComments((current) => current.filter((comment) => comment.id !== id)),
    }),
    [comments],
  );

  const viewed = useMemo(
    () => ({
      viewed: viewedIds,
      toggle: (refId: string) =>
        setViewedIds((current) =>
          current.includes(refId) ? current.filter((id) => id !== refId) : [...current, refId],
        ),
    }),
    [viewedIds],
  );

  const view = useMemo(
    () => ({
      view: diffView,
      setView: (next: DiffView) => {
        setDiffView(next);
        try {
          localStorage.setItem(DIFF_VIEW_KEY, next);
        } catch {
          // Persistence is best-effort.
        }
      },
    }),
    [diffView],
  );

  return (
    <DiffContext.Provider value={files}>
      <ReviewContext.Provider value={review}>
        <DiffViewContext.Provider value={view}>
          <ViewedContext.Provider value={viewed}>{children}</ViewedContext.Provider>
        </DiffViewContext.Provider>
      </ReviewContext.Provider>
    </DiffContext.Provider>
  );
}

/**
 * Jump to an in-page anchor while expanding whatever encloses it: a `tour-navigate` event asks
 * collapsed sections/diffs containing the target to open (they listen for it), then the scroll
 * runs a frame later, after React has committed the expansion.
 */
export function navigateTo(id: string): void {
  window.dispatchEvent(new CustomEvent("tour-navigate", { detail: id }));
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView();
    history.replaceState(null, "", `#${id}`);
  });
}

export interface TourProps {
  title: string;
  meta?: string;
  /** "owner/name" — the owner + repo the GitHub review command posts to. */
  repo?: string;
  /** PR number the GitHub review command posts to. */
  pr?: string;
  /** Head commit SHA of the diff — required by the GitHub review command. */
  headSha?: string;
  children?: ReactNode;
}

export function Tour({ title, meta, repo, pr, headSha, children }: TourProps) {
  const { width, handleProps } = useTourWidth();
  return (
    <div
      className="tour"
      style={width != null ? ({ "--tour-width": `${width}px` } as CSSProperties) : undefined}
    >
      <div className="tour-resize-handle is-left" aria-hidden="true" {...handleProps} />
      <div className="tour-resize-handle is-right" aria-hidden="true" {...handleProps} />
      <header className="tour-header">
        <h1 className="tour-title">{withFilenameCode(title)}</h1>
        {meta ? <p className="tour-meta">{meta}</p> : null}
      </header>
      <div className="tour-body">
        <TourNav />
        <main className="tour-main">
          {children}
          <ReviewExport repo={repo} pr={pr} headSha={headSha} />
        </main>
      </div>
    </div>
  );
}

// All artifacts share the claude.ai origin, so this width key is shared across every tour;
// double-clicking a resize handle clears it back to the CSS default.
const TOUR_WIDTH_KEY = "code-tour:width";
const MIN_TOUR_WIDTH = 640;

/** clamp(640, requested, viewport − 32). Only called from effects/handlers, so `window` is safe. */
function clampTourWidth(value: number): number {
  const max = Math.max(MIN_TOUR_WIDTH, window.innerWidth - 32);
  return Math.round(Math.min(Math.max(value, MIN_TOUR_WIDTH), max));
}

/**
 * Symmetric edge-drag resize. `.tour` is `margin: 0 auto`, so its centre is the viewport
 * centre; the width is just twice the pointer's distance from that centre, giving both handles
 * one formula. Width stays null (CSS default, no inline style) until the reader drags or a saved
 * width is restored — so SSR emits no width and hydration cannot mismatch.
 */
function useTourWidth() {
  const [width, setWidth] = useState<number | null>(null);
  const dragging = useRef(false);
  const latest = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOUR_WIDTH_KEY);
      if (stored == null) return;
      const parsed = Number.parseInt(stored, 10);
      if (Number.isFinite(parsed)) setWidth(clampTourWidth(parsed));
    } catch {
      // A saved width is a nicety; ignore blocked or garbled storage.
    }
  }, []);

  // No preventDefault here: cancelling pointerdown can suppress the browser's dblclick
  // synthesis, and the double-click reset depends on it. Selection during a drag is already
  // prevented by `body.tour-resizing { user-select: none }`.
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    latest.current = null; // per-drag: a click without movement must not (re)persist a width
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.classList.add("tour-resizing");
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const next = clampTourWidth(2 * Math.abs(event.clientX - window.innerWidth / 2));
    latest.current = next;
    setWidth(next);
  };
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    document.body.classList.remove("tour-resizing");
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Capture may already be released.
    }
    try {
      if (latest.current != null) localStorage.setItem(TOUR_WIDTH_KEY, String(latest.current));
    } catch {
      // Persistence is best-effort.
    }
  };
  const onDoubleClick = () => {
    latest.current = null;
    setWidth(null);
    try {
      localStorage.removeItem(TOUR_WIDTH_KEY);
    } catch {
      // Best-effort.
    }
  };

  return {
    width,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick,
    },
  };
}

function ReviewExport({ repo, pr, headSha }: { repo?: string; pr?: string; headSha?: string }) {
  const review = useContext(ReviewContext);
  const [copied, setCopied] = useState<"claude" | "github" | null>(null);
  const [victory, setVictory] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!review || review.comments.length === 0) return null;

  // The target is fixed from the tour's own props (the author sets repo/pr/headSha); the
  // fields used to be editable. Without a full target there is nothing to post a GitHub review
  // against, so only the Claude-prompt export shows.
  const [owner, repoName] = splitRepo(repo);
  const target: GitHubReviewTarget = {
    owner,
    repo: repoName,
    pullNumber: pr?.trim() ?? "",
    commitId: headSha?.trim() ?? "",
  };
  const showGitHub = Boolean(target.owner && target.repo && target.pullNumber && target.commitId);

  const count = review.comments.length;
  const claude = claudeReviewPrompt(review.comments, target);
  const command = githubReviewCommand(review.comments, target);
  const copy = async (kind: "claude" | "github", value: string) => {
    await copyText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1200);
    celebrate();
  };

  // Handing off the review is the finish line — summon the victory screen and fanfare. The
  // sound is started here, inside the copy click, so the browser's autoplay policy allows it
  // (a click grants transient activation that outlives the awaited clipboard write).
  const celebrate = () => {
    try {
      if (!audioRef.current) audioRef.current = new Audio(victorySound);
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    } catch {
      // No Audio constructor or playback blocked — the victory image still shows.
    }
    setVictory(true);
  };

  const dismissVictory = () => {
    setVictory(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  };

  return (
    <section id="review-export" className="tour-review-export" aria-labelledby="tour-review-title">
      <div className="tour-review-export-heading">
        <div>
          <span className="tour-eyebrow">Review export</span>
          <h2 id="tour-review-title">Ready to hand off</h2>
        </div>
        <span className="tour-review-count">{count} {count === 1 ? "comment" : "comments"}</span>
      </div>

      <div className="tour-review-output">
        <div className="tour-review-output-title">
          <strong>Claude prompt</strong>
          <button type="button" onClick={() => copy("claude", claude)}>
            {copied === "claude" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre>{claude}</pre>
      </div>

      {showGitHub ? (
        <div className="tour-review-output">
          <div className="tour-review-output-title">
            <strong>GitHub CLI</strong>
            <button type="button" onClick={() => copy("github", command)}>
              {copied === "github" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre>{command}</pre>
        </div>
      ) : null}

      <VictoryOverlay open={victory} onClose={dismissVictory} />
    </section>
  );
}

/** Split an "owner/name" repo string into its two GitHub target fields. */
function splitRepo(repo?: string): [string, string] {
  const [owner = "", name = ""] = (repo ?? "").split("/");
  return [owner.trim(), name.trim()];
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // file:// pages commonly deny Clipboard API access; use the local fallback.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function hash(value: string): string {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

interface NavSubItem {
  id: string;
  title: string;
}

interface NavItem {
  id: string;
  title: string;
  subItems: NavSubItem[];
}

/** A markdown-TOC-style slug: lowercase, non-alphanumerics collapsed to single dashes. */
function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function TourNav() {
  const review = useContext(ReviewContext);
  const viewedCtx = useContext(ViewedContext);
  const hasComments = (review?.comments.length ?? 0) > 0;
  const [items, setItems] = useState<NavItem[]>([]);
  const [diffRefs, setDiffRefs] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [allCollapsed, setAllCollapsed] = useState(false);

  useEffect(() => {
    // The nav is built from the SSR-rendered DOM after mount: sections are the first level,
    // and any plain <h3> an author wrote inside a section becomes an indented second level —
    // like `#`/`##` in a markdown table of contents. We slugify each heading's text into a
    // `section-id--slug` anchor, de-duplicate collisions, and set it as the heading's id so
    // the nav link (and any external deep link) can scroll to it.
    const usedIds = new Set<string>();
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("section[data-tour-section]"),
    );
    setItems(
      sections.map((s) => {
        const subItems = Array.from(s.querySelectorAll<HTMLHeadingElement>("h3")).map((h) => {
          const title = (h.textContent ?? "").trim();
          const base = `${s.id}--${slugify(title)}`;
          let id = base;
          for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
          usedIds.add(id);
          h.id = id;
          return { id, title: title || id };
        });
        return { id: s.id, title: s.dataset.tourTitle ?? s.id, subItems };
      }),
    );
    setDiffRefs(
      Array.from(document.querySelectorAll<HTMLElement>("[data-tour-diff]")).map(
        (el) => el.dataset.tourDiff ?? "",
      ),
    );

    // Heading ids only exist after this effect runs, so a deep link to one lands before its
    // target exists. Re-apply the hash now that the ids are in place.
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();

    // Scrollspy: walk the same anchors (sections, their <h3>s, and the review-export block) in
    // document order; the active one is the last whose top has scrolled past a band near the
    // viewport top. Runs on scroll/resize, coalesced through requestAnimationFrame. Anchors
    // inside a collapsed section are display:none (offsetParent null) and are skipped; the
    // export block mounts after this effect, so it is resolved lazily per pass.
    const anchors: { id: string; el: HTMLElement }[] = [];
    for (const s of sections) {
      anchors.push({ id: s.id, el: s });
      for (const h of Array.from(s.querySelectorAll<HTMLHeadingElement>("h3"))) {
        if (h.id) anchors.push({ id: h.id, el: h });
      }
    }

    let frame = 0;
    const recompute = () => {
      frame = 0;
      const all = [...anchors];
      const exportEl = document.getElementById("review-export");
      if (exportEl) all.push({ id: "review-export", el: exportEl });
      const threshold = 120;
      let current = all[0]?.id ?? null;
      for (const anchor of all) {
        if (anchor.el.offsetParent === null) continue;
        if (anchor.el.getBoundingClientRect().top <= threshold) current = anchor.id;
        else break;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(recompute);
    };
    recompute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (items.length === 0) return null; // empty during SSR; hydrated in the browser

  const sectionActive = (item: NavItem) =>
    activeId === item.id || item.subItems.some((sub) => sub.id === activeId);

  // Navigate through navigateTo so a collapsed target section expands before the scroll; plain
  // modified clicks (new tab etc.) keep the default anchor behavior.
  const go = (id: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateTo(id);
  };

  const navLink = (id: string, label: string, active: boolean) => (
    <a href={`#${id}`} className={active ? "is-active" : undefined} onClick={go(id)}>
      {label}
    </a>
  );

  // Bulk fold/unfold every diff at once (a nav convenience; leaves per-diff "viewed" state alone).
  const toggleAllDiffs = () => {
    const next = !allCollapsed;
    setAllCollapsed(next);
    window.dispatchEvent(new CustomEvent("tour-diffs-collapse", { detail: next }));
  };

  return (
    <nav className="tour-nav" aria-label="Sections">
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            {navLink(item.id, item.title, sectionActive(item))}
            {item.subItems.length > 0 ? (
              <ul className="tour-nav-sub">
                {item.subItems.map((sub) => (
                  <li key={sub.id}>{navLink(sub.id, sub.title, activeId === sub.id)}</li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
        {hasComments ? (
          <li className="tour-nav-export">
            {navLink("review-export", "Review export", activeId === "review-export")}
          </li>
        ) : null}
        {diffRefs.length > 0 ? (
          <li className="tour-nav-export tour-nav-viewed">
            {diffRefs.filter((ref) => viewedCtx?.viewed.includes(ref)).length} of {diffRefs.length} viewed
          </li>
        ) : null}
        {diffRefs.length > 0 ? (
          <li className="tour-nav-export">
            <button
              type="button"
              className="tour-nav-toggle-all"
              aria-pressed={allCollapsed}
              onClick={toggleAllDiffs}
            >
              {allCollapsed ? "Expand all diffs" : "Collapse all diffs"}
            </button>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
