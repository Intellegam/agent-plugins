/**
 * tour.tsx — an agent-authored PR walkthrough.
 *
 * You write free JSX for narrative and visuals, but you NEVER write code: every code snippet
 * is a REFERENCE into the accompanying `pr.diff`, resolved when the tour is built. A broken
 * reference (unknown file, out-of-range hunk, bad line slice) fails `bun run build`.
 *
 * The tour is NARRATIVE and SKIMMABLE: a reader who only skims — headings, bullets, diagrams,
 * never opening a code block — still fully understands the PR.
 *   - Explain first, cite second — prose and visuals make the point; the <Diff> beneath is the
 *     evidence. Keep the explanation above the diff, not inside it.
 *   - Skimmable above all — clear <h3> signposts, short paragraphs, bullet lists over prose
 *     blocks, definitions set apart (bold lead-in / small table / card). Grasp the shape first.
 *   - Visual-first — ordering, layout, or causality usually reads better as a picture than a
 *     paragraph: a top-down <Graph>, or (you write real JSX) a bespoke visual — SVG, cards,
 *     comparison grids, small widgets — whenever that's clearer. Clear and simple, not minimal.
 *   - Zero-prior-knowledge — define each domain term on first mention; never announce the
 *     pedagogy ("first, the vocabulary"). Graphs top-down (flowchart TD / direction TB), short
 *     labels, two small over one wide (the column is narrow).
 *
 * Structure:
 *   - RED THREAD first: one thesis + 3–6 chapters that each advance it, named by the reader's
 *     question ("What do you invoke?", "How does grounding work?") rather than by filename. Files
 *     and hunks are usually evidence inside chapters; a file-by-file walk is a fine fallback.
 *   1. OPEN by orienting a newcomer: what this is + where it lives, how it's invoked, what you
 *      get and look at, one mental-model diagram — THEN the motivating problem.
 *   2. ONE file-structure overview (<FileTree>, never a plain-text tree) — files, roles, links.
 *   3. Each chapter: explain (visual, skimmable) -> THEN the <Diff> as evidence. Inside a chapter
 *      order by EXECUTION FLOW, not source order (entry point first, even if it's the last hunk,
 *      then what it calls); steps as <h3> sub-headings (the nav shows two levels).
 *   4. Prefer fewer, larger contiguous slices (~10–40 lines) over scattered 3-line fragments.
 *   5. Tests: their own section near the end, less depth, hunks `collapsed`. Mark any low-SIGNAL
 *      diff (tests, snapshots, generated, lockfiles, renames) `collapsed` — collapse by signal,
 *      NEVER by filetype; a Markdown/doc file can be the heart of the change and gets the MOST depth.
 *   6. No catch-all appendix, no <details>. Completeness (EVERY changed line appears in some
 *      <Diff>) is achieved BY the walkthrough itself.
 *
 * The build renders tour.tsx once server-side, then hydrates it into one offline single-file HTML.
 * A bespoke visual must therefore render with no live DOM (touch window/DOM only in useEffect, like
 * <Graph>) and need no external library or network — only React + what tour-viewer bundles.
 *
 * Annotations are line-local footnotes, NOT narrative. Keep them to 0–2 per <Diff>, one sentence
 * each, and use them only for: (1) forward-references (a shown line uses something explained
 * later), (2) pointing at the single key line of a larger slice, or (3) a non-obvious line-level
 * detail (e.g. a deliberate `>=` vs `>`). Everything conceptual goes in the prose BEFORE the
 * block — narrative hidden in annotations breaks the "skip all code and still understand" test,
 * and inline cards push code lines apart, so sparseness keeps the diff readable.
 *
 * Set `pr`, `repo`, and `headSha` on <Tour> whenever the tour is for a real PR: the reader's
 * GitHub review export is then built straight from them. The GitHub-export block appears only
 * when all three are set; otherwise only the Claude-prompt export shows.
 *
 * Components (see the code-tour plugin README for the full contract):
 *   <Section id="slug" title="…">        a navigable section (id is a unique slug)
 *   <h3>Sub-heading</h3>                 plain JSX inside a <Section> — shows up indented under it in the nav (use it for the steps of a walkthrough, per-test-group structure, …)
 *   <Diff file="…" hunk={n} />           shows a whole hunk (1-based) of a file in pr.diff
 *   <Diff file="…" lines={{side,start,end}} />  shows a line slice within ONE hunk
 *   <Diff … collapsed />                 ships the diff folded (low-signal hunks); click expands
 *   <Annotation line={n} side="new">…</Annotation>   a note pinned to a shown line (child of <Diff>)
 *   <Graph source="…mermaid…" />         a Mermaid diagram
 *   <FileTree>…indented text…</FileTree> a file tree (2 spaces per level, folders end "/",
 *                                        optional " — description" per line)
 *
 * `file` is the path exactly as it appears in pr.diff (the new path; the old path for deleted
 * files). `side` is "old" or "new". The rare multiline non-diff snippet goes in a plain <pre>.
 *
 * JSX gotchas: literal < > { } in prose break the parse — wrap such text as <code>{"..."}</code>
 * (e.g. <code>{".<name>.ig/"}</code>) and keep angle brackets out of titles/<h3>s. Mermaid runs
 * strict: quote <Graph> labels with spaces or () like A["build_plan(src, dst)"], and use <br/>.
 */

import { Diff, Annotation, FileTree, Graph, Section, Tour } from "tour-viewer";

export default function TourPage() {
  return (
    <Tour
      title="My PR walkthrough"
      meta="PR #000 · base main · head feature"
      // For a real PR, set all three so the reader can post a GitHub review (the GitHub-export
      // block shows only when repo + pr + headSha are all set):
      // repo="owner/name"
      // pr="000"
      // headSha="abc1234"
    >
      <Section id="overview" title="What this PR does">
        <p>
          Summarize the change in a sentence or two. Use free JSX — paragraphs, lists,
          <code>inline code</code>, and diagrams — to tell the story. Note in prose anything
          you deliberately don't walk through. When the PR has related context — a Linear issue,
          a doc, the tracking project — link those here (verified URLs only).
        </p>

        <Graph source="flowchart TD; A[Request] --> B[Handler] --> C[Store]" />

        {/*
          After orienting the newcomer, add ONE file-structure overview (a <FileTree> and/or a
          top-down mermaid diagram), then walk the red thread chapter by chapter. Explain first
          (prose + a <Graph> or a bespoke JSX visual — you may define your own components), THEN
          reference the diff as evidence. Uncomment and edit:

          <Diff file="path/to/changed_file.py" lines={{ side: "new", start: 10, end: 40 }}>
            <Annotation line={25} side="new">The single key line worth pointing at.</Annotation>
          </Diff>

          Or show a whole hunk (good for boring wiring/docs and for test hunks):

          <Diff file="path/to/changed_file.py" hunk={1} />
        */}
      </Section>
    </Tour>
  );
}
