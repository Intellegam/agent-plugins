/**
 * `<Section id="slug" title="...">…</Section>` — a navigable anchor. The `id` should be a
 * unique slug (`[a-z0-9][a-z0-9-]*`); it becomes the section's DOM id and the nav link target.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface SectionProps {
  id: string;
  title: string;
  children?: ReactNode;
}

/** The shared collapse toggle: a chevron that points down when expanded, right when collapsed. */
export function Chevron({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="tour-chevron"
      aria-expanded={expanded}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6l4 4 4-4" />
      </svg>
    </button>
  );
}

export function Section({ id, title, children }: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const ref = useRef<HTMLElement>(null);

  // Navigation (nav links, progress links, manual hash edits) must reach anchors inside a
  // collapsed section, so expand whenever a `tour-navigate` event or the hash targets this
  // section or anything in it. The body is hidden, never unmounted: the h3 ids the nav stamps
  // on the DOM — and any in-progress comment draft — survive a collapse cycle.
  useEffect(() => {
    const expandIfTargeted = (targetId: string) => {
      if (!targetId || !ref.current) return;
      const target = document.getElementById(targetId);
      if (target && ref.current.contains(target)) setCollapsed(false);
    };
    const onNavigate = (event: Event) => expandIfTargeted((event as CustomEvent<string>).detail);
    const onHash = () => expandIfTargeted(window.location.hash.slice(1));
    window.addEventListener("tour-navigate", onNavigate);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("tour-navigate", onNavigate);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  // `data-tour-title` stays the raw string: the nav reads it as plain text, so the <code>
  // chips added to the visible heading never leak into nav labels.
  return (
    <section
      id={id}
      ref={ref}
      data-tour-section=""
      data-tour-title={title}
      className="tour-section"
    >
      <h2 className="tour-section-title">
        <Chevron
          expanded={!collapsed}
          label={collapsed ? "Expand section" : "Collapse section"}
          onClick={() => setCollapsed((current) => !current)}
        />
        <span>{withFilenameCode(title)}</span>
      </h2>
      <div hidden={collapsed}>{children}</div>
    </section>
  );
}

/**
 * Wrap filename-like tokens in a title in <code> so they read as inline-code chips: a path with
 * a slash (`foo/bar.tsx`) or a `name.ext` with a lowercase 1–5 char extension (`build.ts`). It
 * deliberately under-matches — a token needs ≥2 word chars before the dot, which skips prose
 * abbreviations like "e.g." or "z.B." Applied to <Tour>/<Section> titles only (not author <h3>s).
 */
export function withFilenameCode(text: string): ReactNode {
  const pattern =
    /[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_.-]*[A-Za-z0-9_])+|[A-Za-z0-9_-]{2,}\.[a-z]{1,5}\b/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(<code key={key++}>{match[0]}</code>);
    last = match.index + match[0].length;
  }
  if (last === 0) return text; // no filename tokens — return the plain string unchanged
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
