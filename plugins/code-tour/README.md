# code-tour

Agent-generated visual PR walkthroughs (DEV-588). An agent authors a `tour.tsx` page — free
JSX for narrative and visuals — but **code is never written, only referenced**: every snippet
is a reference into an accompanying raw `pr.diff`, resolved at build time. `bun run build`
bundles everything into a single self-contained `tour.html` that works offline by double-click.

## Authoring a tour

The [`code-tour` skill](skills/code-tour/SKILL.md) is the front door: it drives the whole flow —
export the PR diff, scaffold a workspace, author `tour.tsx`, build, publish the result as a
Claude Artifact, and (on request) post the link back to the PR. Invoke it via the Skill tool (`code-tour`), or ask Claude to "create a code tour
for PR N". The `setup.sh` → edit `tour.tsx` → `bun run build` commands below are that same flow run
by hand.

## The contract

A tour is two artifacts:

- `pr.diff` — raw `git diff base...head` output, verbatim (never LLM-written).
- `tour.tsx` — an LLM-authored React page. Narrative/visuals are arbitrary JSX; **code appears
  only through reference components**, so hallucinated diff content is structurally impossible.

### Component API

Import from `tour-viewer`:

| Component | Purpose |
|---|---|
| `<Tour title meta>` | Page frame (header + table-of-contents nav). Root of `tour.tsx`. |
| `<Section id="slug" title="…">` | Navigable anchor. `id` is a slug `[a-z0-9][a-z0-9-]*`. |
| `<Diff file="…" hunk={n} />` | Shows a whole hunk (1-based) of a file in `pr.diff`. |
| `<Diff file="…" lines={{side,start,end}} />` | Shows a line slice within ONE hunk (`side` = `old`/`new`). |
| `<Annotation line={n} side="new">…</Annotation>` | An AI-authored explanation pinned to a shown line (used as a child of `<Diff>`). |
| `<Graph source="…mermaid…" />` | A Mermaid diagram (bundled, rendered client-side; no CDN). |

`file` is the path exactly as it appears in `pr.diff` (the new path; the old path for deleted
files). Reference everything relevant; if you deliberately skip some changes, say so in prose.

### The one check

There is no coverage gate. The only build-time check is that **every `<Diff>` reference
resolves**: an unknown file, an out-of-range hunk, or a line slice that doesn't fit inside a
single hunk fails the build with a readable message. A broken reference also renders a visible
error box in the page.

`pr.diff` is parsed with react-diff-view's `parseDiff`. A slice selects the rows of one hunk
whose `{side}` line numbers fall in `[start, end]`, plus opposite-side rows strictly between
them (so an interleaved deletion is never dropped), and gets a corrected `@@` header. This
lives in `tools/tour-viewer/src/diff.ts`.

## Review UI

The visible diff is rendered by the pinned `@pierre/diffs` package. `tour-viewer` owns only
the product layer around it:

- a persistent top-right 1-column / 2-column preference (narrow blocks fall back to unified),
- Pierre's word-level intraline highlighting and source-line selection,
- AI explanations authored through `<Annotation>`,
- user comments created by clicking or dragging line numbers,
- compact inline comment threads directly beneath their anchored source line,
- local persistence keyed by the exact `pr.diff`, and
- a final Claude prompt plus one `gh api` command that creates a bundled GitHub review.

User comments store GitHub's current anchor shape (`path`, old/new side, end line, optional
start line/side). Resolved comments remain visible but are omitted from both exports. The raw
patch is never edited or regenerated: a resolved hunk is wrapped in minimal file headers and
passed to Pierre, so displayed code still comes verbatim from `pr.diff`.

### Dependency boundary

`@pierre/diffs` is deliberately consumed as a pinned dependency rather than vendored. It owns
patch rendering, Shiki, split/unified layout, intraline diffing, selection, and annotation
slots. Our React code owns comment cards, persistence, GitHub mapping, exports, and the tour
visual language. If Pierre must be patched later, keep that change as a small recorded patch
against the pinned version instead of copying its renderer into this package.

## Build pipeline

`tools/tour-viewer/scripts/build.ts` operates on a workspace containing `tour.tsx` + `pr.diff`:

1. **Render** — the tour is rendered once with `react-dom/server`. This does double duty: any
   unresolved `<Diff>` reference is recorded (the build prints the list and exits 1), and the
   same markup is embedded so the page reads offline before JS runs. SSR is DOM-free (mermaid
   only touches the DOM in a browser `useEffect`).
2. **Single-file build** — `vite` + `vite-plugin-singlefile` bundle the tour, its components
   and the embedded `pr.diff` into one offline `tour.html` (all JS/CSS inline, no requests).

## Commands

```bash
# from plugins/code-tour (dev harness — hoists deps for tests + fixtures)
bun install
bun test                              # slice semantics + e2e build

# scaffold a workspace (copies the template, wires the build, installs deps)
skills/code-tour/scripts/setup.sh <targetDir> --diff path/to/pr.diff
#   or: … --base <ref> --head <ref>   (runs git diff for you)

# build a tour (single-file tour.html; fails on broken diff refs)
cd <targetDir> && bun run build

# print a hunk/line-number map of pr.diff (for lines={{}} slices + annotation targets)
cd <targetDir> && bun run map
```

## Layout

```
plugins/code-tour/
├── skills/code-tour/scripts/setup.sh   # thin entry point → tour-viewer setup
└── tools/tour-viewer/
    ├── src/components/                  # Tour, Section, Diff, Annotation, Graph
    ├── src/diff.ts                      # parse + slice + reference resolution
    ├── src/failures.ts                  # broken-reference sink for the build
    ├── template/tour.tsx                # skeleton the setup script copies
    ├── scripts/build.ts                 # render check + single-file build
    ├── scripts/setup.ts                 # scaffolds a tour workspace
    ├── scripts/map.ts                   # hunk/line-number map of pr.diff (authoring aid)
    └── tests/                           # bun test
```
