---
name: code-tour
description: Create a visual PR walkthrough — a "code tour". Use when the user asks to "create a code tour", "make a PR walkthrough", "build a tour for PR X", "explain this PR visually", or wants a shareable visual review of a diff. Produces a single offline tour.html whose every code snippet is a grounded reference into the real diff.
---

# Code Tour

Author a `tour.tsx` — a narrated, illustrated walkthrough of a pull request — where **you never write code**: every snippet is a reference into a raw `pr.diff`, resolved at build time. `bun run build` bundles it into one offline `tour.html`. The tour explains the PR to a reader with zero prior knowledge and doubles as a line-level review surface.

**Prerequisites:** `bun` ≥ 1.x, `git`, a writable workspace, and dependency access for the initial install. Everything runs offline after that install.

Five steps: **export the diff → scaffold → author `tour.tsx` → build & fix → deliver.**

## Load the host adapter

Resolve this skill's announced base directory, then read exactly one adapter completely before acting:

- Claude Code: `references/claude-code.md`
- OpenAI Codex or ChatGPT Work: `references/openai.md`

The adapter defines how to locate the setup script and deliver or optionally publish the built tour. If the host cannot be identified or the adapter cannot be read, stop and report the problem rather than guessing.

## 1. Export the diff

Capture the raw diff verbatim. Never edit or reformat it — it is the source of truth for every line of code the tour shows.

```bash
git diff <base>...<head> > pr.diff      # or:  gh pr diff <N> > pr.diff
```

Not inside the target repo, or the PR number is ambiguous (two repos can each have a `#150`)? Pass `--repo`: `gh pr diff <N> --repo owner/name > pr.diff`.

## 2. Scaffold a workspace

Run the plugin's setup script. It copies the template, wires the build, and installs deps:

```bash
"<skill-base>/scripts/setup.sh" <workDir> --diff pr.diff
#   or let it run git for you:   … <workDir> --base <ref> --head <ref>
```

This produces `<workDir>/tour.tsx` (the only file you edit), `<workDir>/pr.diff`, and a wired `package.json`. `tour.tsx` starts as the template — read it first, then replace it wholesale in step 3.

## 3. Author `tour.tsx`

This is the deliverable. A handful of rules are hard; everything else is yours to shape.

**The one goal:** a reader who only *skims* — headings, bullets, diagrams, never opening a code block — still fully understands the PR. The tour is therefore *narrative* (one red thread) and *skimmable* (a shape you grasp before reading). You explain; each `<Diff>` is only the evidence that backs what you just said.

Tip: for the exact line numbers a `lines={{...}}` slice or an `<Annotation line={n}>` needs, run `bun run map` in the workspace. It prints every changed file's hunks with each row's old- and new-side line number, so you don't have to open the checked-out file to count through `@@` headers.

### What's actually fixed

Only a few things are non-negotiable — treat everything after this as a *tip toward the goal*: follow it when it helps, break it when the PR is better served otherwise.

- **Code from the PR appears only through `<Diff>` references into `pr.diff`.** A reference that doesn't resolve fails the build, so hallucinated code is structurally impossible. Authoring the tour's *own* presentation — JSX, SVG, CSS, small components — is expected and encouraged; that isn't "writing the PR's code".
- **Every changed line ends up shown somewhere.** The tour is also a review surface, so nothing silently vanishes — but *how much depth* each line gets is entirely yours to allocate.
- **For a real PR, set `pr`, `repo` ("owner/name") and `headSha` on `<Tour>`.** That's what lets the reader post their review to GitHub (the GitHub-export block shows only when all three are set; the agent-prompt export always shows).
- Two authoring gotchas the build can't catch — JSX escaping and Mermaid label quoting — are in *Components* below; they just break the render.

### Tips to reach the goal

**Make it skimmable.** A reader should be able to grasp the shape before reading a word: `<h3>` signposts, short paragraphs, bullet lists in preference to prose blocks, and definitions set apart (a bold lead-in, a small table, a card) instead of buried mid-sentence — defined naturally on first mention, without announcing the pedagogy. Write clearly and simply; cut density, not clarity. Wrapping file, symbol, and function names in `<code>` makes them read as inline chips (`<Section>`/`<Tour>` titles auto-detect filenames).

**Lean on pictures.** Ordering, layout, and causality usually land faster as a picture than a paragraph — a top-down `<Graph>` (`flowchart TD` / `direction TB`, short labels, two small over one wide), or, since you write real JSX, a bespoke visual when that's clearer.

**Find the one story.** A tour reads best as a single red thread: one thesis, and a handful of chapters that each advance it — ideally titled by the reader's question ("What do you invoke?", "How does grounding prevent hallucination?") rather than by filename, since files and hunks tend to work better as evidence *inside* chapters than as the chapter structure itself (a file-by-file walk is a fine fallback when the change genuinely is file-shaped). A solid default arc: orient a newcomer first — what it is and where it lives, how it's invoked, what they get and look at, one mental-model diagram — before the motivating problem; then a file-structure overview (`<FileTree>`); then the chapters, ordering the pieces inside each by execution flow rather than source order.

**Link out to the context.** When the PR has related material a reader would want — the Linear/Jira issue, a Notion or design doc, the tracking project, sibling PRs, the spec or agent transcript behind it — surface it in the orienting section: a plain link is enough, a nicer rendering welcome. Draw these only from what you can verify (the PR description, the branch, commit trailers, or what the user hands you); never invent a URL — an unverified link is worse than none, so skip it when there's nothing real to point at.

**Explain, then show.** Prose and visuals carry the point; the `<Diff>` beneath is the evidence that backs it. Aim for a tour a reader could follow having skipped every code block — which is what keeps the explanation above the diff rather than inside it. Fewer, larger contiguous slices (~10–40 lines) with the narrative right there usually beat scattered 3-line fragments.

**Give the heart the most depth.** Spend your explanation where the feature's value actually lives — even when that's a prompt, a schema, or a doc rather than the plumbing. Boring remainders (docs mirroring behaviour, one-line wiring) can share one short explanation, and low-signal hunks ship `collapsed` (tests, snapshots, generated code, lockfiles, mechanical renames). Judge by signal, not filetype: a test that *is* the story gets depth, a Markdown file can be the heart of the change.

**Annotations are footnotes, not narrative.** 0–2 per `<Diff>`, a sentence each — a forward-reference, the single key line of a larger slice, or a non-obvious detail. Everything conceptual goes in the prose before the block.

**Bespoke visuals — know the envelope.** `bun run build` renders `tour.tsx` once server-side, then hydrates it into one offline single-file HTML. Keep that in mind and you know what works: a custom visual is fine as long as it renders without a live DOM (touch `window`/DOM only inside `useEffect`, like `<Graph>`) and needs no external library or network — only React and what `tour-viewer` bundles. Static is free and robust; a stateful widget is fine when SSR-safe. If it builds, it's allowed.

### Techniques — optional inspiration

Patterns that make a strong tour — this table is enough to apply any of them; each links to a worked example if you want one. **None is mandatory:** reach for the ones that fit this PR, skip the rest, invent better freely.

| Technique | When it fits | The move |
|---|---|---|
| [walkthrough-map](techniques/walkthrough-map.md) | A section walks 3+ steps of one flow and the reader could lose the thread | Repeat one small flow diagram per step, highlighting the current node — a "you are here" map |
| [file-overview](techniques/file-overview.md) | The PR touches more than ~3 files, or the file relationships carry meaning | An annotated `<FileTree>` + a role table as the entry section; name the heart explicitly |
| [execution-flow](techniques/execution-flow.md) | Source order hides the logic (entry point at the bottom, helpers on top) | Walk in call order — entry point first, then what it calls — not top-to-bottom |
| [before-after](techniques/before-after.md) | A refactor changes the *shape* of code and the contrast is the story | Show the same region twice: an old-side slice, then the new-side slice |
| [data-shapes](techniques/data-shapes.md) | The PR adds or changes a data structure, config, schema, or API surface | Render it as a plain-JSX table or cards, paired with the diff it summarizes |
| [state-maps](techniques/state-maps.md) | The PR is about safety, invariants, or failure handling | One top-down diagram mapping every outcome to its guaranteed end state — including the impossible ones |
| [bespoke-visuals](techniques/bespoke-visuals.md) | The clearest explanation is a picture the built-ins don't give you | Define your own JSX/SVG/CSS component (SSR-safe, no external libs) |
| [pseudocode](techniques/pseudocode.md) | An intricate algorithm's idea is hard to read line-by-line | A few plain-language steps beside the real diff — never realistic syntax |

### Components

Imported from `tour-viewer` (full contract in the code-tour plugin README):

| Component | Purpose |
|---|---|
| `<Tour title meta repo pr headSha>` | Page frame + nav. Root of the file. `repo`/`pr`/`headSha` are optional; the GitHub review export appears only when all three are set. |
| `<Section id="slug" title>` | A navigable section. `id` is a slug `[a-z0-9][a-z0-9-]*`. |
| `<Diff file hunk={n}>` | A whole hunk (1-based) of a file in `pr.diff`. |
| `<Diff file lines={{side,start,end}}>` | A line slice within ONE hunk; `side` is `"old"`/`"new"`. |
| `<Diff … collapsed>` | Ships the diff folded (for low-signal hunks); a click expands. |
| `<Annotation line={n} side="new">` | A note pinned to a shown line; child of `<Diff>`. |
| `<Graph source="…mermaid…">` | A Mermaid diagram (bundled, no CDN). |
| `<FileTree>…text…</FileTree>` | A file tree from plain indented text: 2 spaces per level, folders end `/`, optional ` — description` per line, blank line starts a new root. |

`file` is the path exactly as it appears in `pr.diff` (the new path; the old path for deleted files). The rare multiline non-diff snippet (never PR code — that must come from `pr.diff`) goes in a plain `<pre>`, which gets markdown-codeblock styling.

Two authoring gotchas the build can't all catch for you:

- **JSX escaping.** Literal `<`, `>`, `{`, `}` in prose break the parse — a token like `.<name>.ig/` reads as a tag. Wrap such text as `<code>{"…"}</code>` (e.g. `<code>{".<name>.ig/"}</code>`), and keep literal angle brackets out of `<Section>`/`<Tour>` titles and `<h3>`s.
- **Mermaid is strict.** Quote any `<Graph>` node label with spaces or `()` — `A["build_plan(src, dst)"]` — and use `<br/>` for line breaks. An unquoted label fails to render and the graph falls back to showing its source (only visible in the browser, not at build time).

## 4. Build & fix

```bash
cd <workDir> && bun run build
```

The build first asks Git to validate the raw patch structure, then renders the tour once to validate every `<Diff>` reference, every `<Annotation>` target, and complete changed-line coverage. An annotation on a line the shown hunk doesn't contain fails; so does any inserted or deleted line from `pr.diff` that no `<Diff>` shows. On error it lists the patch error, broken references, or uncovered file/side/line ranges and exits non-zero — fix them (or the surrounding tour) and rebuild until it exits 0.

Once it exits 0, follow the loaded host adapter's visual-QA procedure before publishing. Do not assume a macOS opener or claim visual verification merely because a GUI command launched. Inspect that graphs render rather than showing Mermaid source, annotations sit on the intended lines, wide and narrow layouts hold, and no runtime-error panel appears. If the host exposes no browser or vision surface, say explicitly that visual QA was not performed and ask the user to open the local file; the structural build may still pass, but that is not visual verification.

Then run the editorial check the build can't: **skim only the headings, prose, and diagrams — without opening a single code block — and confirm the whole PR is understandable that way, and that every section advances the one thesis.** If a section only makes sense once you read its diff, the explanation above it is missing.

## 5. Deliver

Follow the loaded host adapter. Building `tour.html` completes a request to create a code tour; publishing, hosting, or posting it externally is a separate action that requires explicit user authorization. Always return the built file or its path and mention that it opens locally by double-click.

When the user explicitly authorizes publishing, use only the host adapter's supported route. Do not substitute an in-chat visualization for the full review surface. After publishing, offer to post the shareable link on the PR, but confirm before doing so because a private or workspace-only URL may not work for every reviewer and a PR comment is outward-facing. On their go-ahead, post or update a single PR comment:

```bash
gh pr comment <N> --repo owner/name --edit-last --create-if-none \
  --body "📖 **[Code tour](<tour-url>)** — visual walkthrough of this PR."
```

Then tell the user what the page does beyond reading — it is a review surface:

- Select a line, or drag across a line range, to leave a comment. Comments persist locally, keyed to this exact `pr.diff`.
- Each diff has a "Viewed" checkbox (checking folds the diff away, GitHub-style); a small counter at the bottom of the nav tracks how many diffs are viewed. Viewed state persists locally too.
- When they're done, the page generates an agent-ready review prompt **and** — when the tour set `repo`, `pr`, and `headSha` — a single `gh api` command that posts all comments as one GitHub review, built straight from those props (a stale SHA will be rejected by GitHub). If any of the three is missing, only the agent prompt is offered.
