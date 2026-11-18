# code-tour

Agent-generated visual PR walkthroughs (DEV-588). An agent authors a `tour.tsx` page — free
JSX for narrative and visuals — but **code is never written, only referenced**: every snippet
is a reference into an accompanying raw `pr.diff`, resolved at build time. `bun run build`
bundles everything into a single self-contained `tour.html` that works offline by double-click.

## Authoring a tour

The [`code-tour` skill](skills/code-tour/SKILL.md) is the front door: it drives the shared flow —
export the PR diff, scaffold a workspace, author `tour.tsx`, build, and deliver the offline file.
When the host supports writable sub-agents, the invoking agent delegates tour creation to one fresh
worker while retaining delivery and external-action decisions itself. Claude Code uses the packaged
`code-tour-author` agent; Codex creates an equivalent fresh worker with `spawn_agent`.
Host adapters define optional publishing for Claude Code and OpenAI Codex/ChatGPT Work; publishing
and posting a link to the PR require explicit authorization. Invoke it directly or ask the agent to
"create a code tour for PR N". The `setup.sh` → edit `tour.tsx` → `bun run build` commands below
are that same flow run by hand.

## The contract

A tour is two artifacts:

- `pr.diff` — raw `git diff base...head` output, verbatim (never LLM-written).
- `tour.tsx` — an LLM-authored React page. Narrative/visuals are arbitrary JSX; **code appears
  only through reference components**, so hallucinated diff content is structurally impossible.

### Component API

Import from `tour-viewer`:

| Component | Purpose |
|---|---|
| `<Tour title meta repo pr headSha>` | Page frame (header + table-of-contents nav). `repo`/`pr`/`headSha` enable GitHub review export. |
| `<Section id="slug" title="…">` | Navigable anchor. `id` is a slug `[a-z0-9][a-z0-9-]*`. |
| `<Diff file="…" hunk={n} />` | Shows a whole hunk (1-based) of a file in `pr.diff`. |
| `<Diff file="…" lines={{side,start,end}} />` | Shows a line slice within ONE hunk (`side` = `old`/`new`). |
| `<Diff … collapsed />` | Ships a low-signal diff folded until the reader expands it. |
| `<Annotation line={n} side="new">…</Annotation>` | An AI-authored explanation pinned to a shown line (used as a child of `<Diff>`). |
| `<Graph source="…mermaid…" />` | A Mermaid diagram (bundled, rendered client-side; no CDN). |
| `<FileTree>…text…</FileTree>` | Renders an indented plain-text file tree. |

`file` is the path exactly as it appears in `pr.diff` (the new path; the old path for deleted
files). Every changed line must appear in a `<Diff>`; give low-signal changes minimal prose and
ship their diff collapsed rather than omitting them.

### Build-time validation

The build enforces both halves of the grounding contract:

- **`pr.diff` is structurally valid.** Git's non-applying parser rejects empty, malformed, or
  truncated patch input before the tour is rendered.
- **Every `<Diff>` reference resolves.** An unknown file, an out-of-range hunk, or a line slice
  that doesn't fit inside a single hunk fails with a readable message. A broken reference also
  renders a visible error box in the page.
- **Every inserted and deleted line is covered.** After server rendering, the build compares the
  side-qualified changed rows shown by all resolved whole-hunk and line-slice references with the
  complete parsed `pr.diff`. Missing file/side/line ranges fail the build before bundling, and a
  failed rebuild removes any stale `tour.html`.

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
- user comments created by clicking or dragging line numbers, editable and deletable in place,
- compact inline comment threads directly beneath their anchored source line,
- local persistence keyed by the exact `pr.diff`,
- a final agent prompt plus one `gh api` command that creates a bundled GitHub review, and
- a victory easter egg: copying either export fills the screen with a FromSoftware "VICTORY"
  screen and plays the fanfare until you click to dismiss (assets in
  `src/components/assets/`, inlined into `tour.html` like everything else).

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

1. **Validate and render** — Git first parses `pr.diff` without applying it, then the tour is
   rendered once with `react-dom/server`. Unresolved `<Diff>` references and uncovered changed
   lines are recorded (the build prints the list and exits 1), and the same markup is embedded so
   the page reads offline before JS runs. SSR is DOM-free (mermaid only touches the DOM in a
   browser `useEffect`).
2. **Single-file build** — `vite` + `vite-plugin-singlefile` bundle the tour, its components
   and the embedded `pr.diff` into one offline `tour.html` (all JS/CSS inline, no requests).

## Commands

```bash
# from plugins/code-tour (dev harness — hoists deps for tests + fixtures)
bun install
bun test                              # slice semantics + e2e build

# scaffold a workspace (copies the template, wires the build, installs deps with a local tempdir)
skills/code-tour/scripts/setup.sh <targetDir> --diff path/to/pr.diff
#   or: … --base <ref> --head <ref>   (runs git diff for you)

# build a tour (single-file tour.html; fails on broken refs or incomplete coverage)
cd <targetDir> && bun run build

# print a hunk/line-number map of pr.diff (for lines={{}} slices + annotation targets)
cd <targetDir> && bun run map

# serve the built file unchanged on loopback for browser-based visual QA
cd <targetDir> && bun run preview
```

## Layout

```
plugins/code-tour/
├── skills/code-tour/scripts/setup.sh   # thin entry point → tour-viewer setup
└── tools/tour-viewer/
    ├── src/components/                  # Tour, Section, Diff, Annotation, Graph
    ├── src/diff.ts                      # parse + slice + reference resolution
    ├── src/failures.ts                  # reference + changed-line validation sink
    ├── template/tour.tsx                # skeleton the setup script copies
    ├── scripts/build.ts                 # render check + single-file build
    ├── scripts/setup.ts                 # scaffolds a tour workspace
    ├── scripts/map.ts                   # hunk/line-number map of pr.diff (authoring aid)
    ├── scripts/preview.ts               # byte-preserving loopback server for visual QA
    └── tests/                           # bun test
```
