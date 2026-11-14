# PR Card

The PR card opens the PR body so a maintainer can decide in seconds, on GitHub
or in any tool that reads the PR. Its data is stored once as JSON in a hidden
comment; tools parse that, people read the rendered card. The PR title is the
card's title; do not copy it into the card.

## Managed Region

The card sits between two markers at the very top of the body:

```markdown
<!-- pr-card:start -->
...rendered card, then the data block, then the Linear block...
<!-- pr-card:end -->
```

Everything after the end marker belongs to the repository's PR template or the
detailed description and is never rewritten by card updates. The region is
agent-managed: render it from the JSON every time, and put human notes below
it. A body with more than one region or data block is invalid.

When opening a PR, put two `---` lines after the end marker and fold the detailed
description (template sections included) into
`<details><summary><b>Full description</b></summary>` … `</details>`, so the
card is what a reader sees first. Leave sections a bot rewrites between its own
markers, such as CodeRabbit's summary, after the fold.

## Rendered Card

The card uses only GitHub-flavoured markdown, a little HTML, and Mermaid, so it
also reads in Linear and in email. It leaves out what GitHub already shows,
such as the PR's total size and file count. Icons: ✅ `ok`, 👀 `watch`, ⚠️
`risk`. Pills are `<kbd>` elements; GitHub's pill style overrides bold around
one, so bold goes inside it. A `---` line, with a blank line before and after
it (without one GitHub turns the paragraph above into a heading), separates
four parts: header and
Why / What / How; visual and evidence; merge risk through the plan line;
Touches and footer. An empty part gets no line.

1. **Header**: the level as a four-step meter in a pill, then the priority in
   a pill when `priority` is set:

   ```markdown
   <kbd>🟨🟨⬜⬜ Typical risk</kbd> <kbd>P2</kbd>
   ```

   Meters: `low` 🟩⬜⬜⬜ Low risk, `typical` 🟨🟨⬜⬜ Typical risk, `high`
   🟧🟧🟧⬜ High risk, `very_high` 🟥🟥🟥🟥 Very high risk. Without a rating
   the first pill reads `Not rated`.
2. **Why / What / How**: one paragraph each, led by a pill label and a blank
   line between them. Labels follow the PR's conventional-commit type: `fix` →
   Problem / Fix / How; `feat` → Need / Feature / How; any other type → Why /
   Change / How. `why` and `what` are one short sentence each; `how` may take
   two or three. Write for someone who has not read the code.

   ```markdown
   <kbd>Problem</kbd> &nbsp;Recovery replaced healthy queued work during long ingestions.

   <kbd>Fix</kbd> &nbsp;A request no worker has claimed is replaced only after the queue's timeout.

   <kbd>How</kbd> &nbsp;...
   ```

3. **Visual** (optional, at most two), each under a `####` heading taken from
   its `title` (flow), `caption` (numbers) or `where` (message); add one only
   when it explains the change faster than the sentences.
   - `flow`: a Mermaid `flowchart LR` fork. The leading steps `before` and
     `after` share are drawn once, plain, with the last one as a `{{...}}`
     decision node; from it, a `before` edge runs through the rest of
     `before` in red and an `after` edge through the rest of `after` in green,
     with step `afterKey` bold. The shared part stops before the shorter
     path's last step, so each branch keeps at least one step; paths that do
     not differ get no flow. Both paths hold at least one step: a process
     that is new or removed gets a single `"None"` step on its empty side.
     Without a shared step, draw the two paths as separate rows. Classes: plain `fill:#f6f8fa,stroke:#d1d9e0,color:#1f2328`,
     red `fill:#ffebe9,stroke:#cf222e,color:#82071e`, green
     `fill:#dafbe1,stroke:#1a7f37,color:#116329`. Quote every label.
   - `numbers`: a `| | Before | After |` table with each After value bold.
   - `message`: a `diff` code block, `- ` before and `+ ` after.
4. **Evidence** (optional): a quote, `> **Evidence** · <text> [<linkText> ↗](<url>)`.
   When `evidence.series` has two or more values, add a Mermaid `xychart-beta`
   bar chart below it with `seriesLabel` as the title, `labels` on the x-axis
   and the y-axis labels and ticks hidden. Quote labels that contain spaces.
5. **Merge risk** under `#### Merge risk`: one row per check in the order of
   `rows`, with its `short`; a row that is not `ok` is bold.

   ```markdown
   | | Check | In short |
   | :---: | :--- | :--- |
   | ✅ | Alignment | Inside the existing Mistral stack |
   | 👀 | **Verification** | **16 pages is a guess, not tried on real files** |
   ```

   Below it, `<details><summary>Full reasons</summary>` holds the same table
   with `| | Check | Why |` and each row's `line`, rows that are not `ok`
   first.
6. **To lower it** (when `lower` is not empty): a bold label, then a task
   list, `- [ ] **Before merge:** ...` or `- [ ] **After merge:** ...` per
   step. Ticks are the one part not rendered from JSON: on a refresh, keep a
   step ticked when the old card has a ticked step with the same `when` and
   text.
7. **Riskier than planned**: when `drift` is not empty, a
   `| Riskier than planned | Planned | Now | Kept because |` table whose first
   cell is the item (the check's name, `Overall level`, or the area's name),
   a colon and its `what`, with icons for verdicts, level names for `level`, `minor` or `–` for an area the
   baseline listed as minor or did not list, and `lowered` when `kept` is
   null. Otherwise one line, `<sub>Matches the planned risk profile.</sub>`,
   or `<sub>No plan profile was rated for this PR.</sub>` when `planned` is
   null.
8. **Touches** under `#### Touches <sub>▰ = 100 lines</sub>`: one fold per
   area, in the reviewer's order.

   ```markdown
   <details><summary><code>▰▰▰▰▱▱▱▱▱▱</code> &nbsp;<kbd><b>apps/processing</b></kbd> &nbsp;👀</summary>

   <sub><code>+289 −65</code> lines in 7 files</sub>

   Recovery now replaces a never-claimed request only after the queue's timeout.

   <sub><code>file_recovery.py</code>, <code>results.py</code> +5 more</sub>

   </details>
   ```

   The bar has ten cells, one filled per started 100 lines of `add + del`
   (at least one, at most ten). An area with no changed lines (only binary
   files, pure renames or empty files) has an empty bar, and its fold says
   `<sub>No line changes in N files</sub>` in place of the count. A meaningful area's name is bold inside its
   pill and followed by its icon; a minor area has neither. The fold holds the
   line count, the area's `note`, and its file names (the last path segment,
   in code spans, at most five, then `+N more`). An area without `add` and
   `del` (a `v: 1` card) has no bar, and its fold holds only its `note`.
9. **Footer**: `<sub>Overview as of <code>` + the first 7 characters of
   `risk.head` + `</code> · updated after every push</sub>`; leave it out
   without a rating.
10. The data block and the Linear block, only when the reviewer returned a
    valid rating.

Escape `|` as `\|` inside table cells, and `"` as `#quot;` inside Mermaid
labels. Every `<details>` fold has a blank line after `</summary>` and before
`</details>`, or GitHub shows its markdown as plain text.

## Data Block

```markdown
<!-- pr-card v2
{ ...JSON... }
-->
```

Escape every `>` inside JSON strings as `\u003e`, so no string can contain
`-->` and end the comment early.
Readers ignore a block whose `v` they do not know and treat malformed JSON as
no card.

```json
{
  "v": 2,
  "type": "fix",
  "priority": "P2",
  "why": "One short sentence.",
  "what": "One short sentence.",
  "how": "One or two sentences.",
  "visual": [
    { "type": "flow", "title": "How it works", "before": ["Step", "Fails"], "after": ["Step", "Works"], "afterKey": 1 },
    { "type": "numbers", "caption": "...", "rows": [{ "label": "...", "before": "...", "after": "..." }] },
    { "type": "message", "where": "error toast", "before": "...", "after": "..." }
  ],
  "evidence": {
    "text": "One sentence.", "url": "https://...", "linkText": "Report",
    "series": [0, 3, 12], "labels": ["Nov 10", "Nov 11", "Nov 12"], "seriesLabel": "Failed uploads per day"
  },
  "risk": {
    "mode": "diff",
    "head": "<commit SHA assessed>",
    "base": "<merge-base SHA>",
    "level": "typical",
    "rows": [
      { "row": "alignment", "verdict": "ok", "short": "About eight words.", "line": "..." },
      { "row": "impact", "verdict": "watch", "short": "...", "line": "..." },
      { "row": "verification", "verdict": "ok", "short": "...", "line": "..." },
      { "row": "rollback", "verdict": "ok", "short": "...", "line": "..." },
      { "row": "error_detection", "verdict": "watch", "short": "...", "line": "..." }
    ],
    "areas": [
      { "name": "access", "meaningful": true, "verdict": "watch", "note": "One sentence.",
        "paths": ["lib/access/share.ts"], "add": 40, "del": 6 },
      { "name": "core", "meaningful": false, "note": "One sentence.", "paths": [], "add": 0, "del": 0 }
    ],
    "lower": [
      { "when": "before_merge", "text": "One step." },
      { "when": "after_merge", "text": "One step." }
    ],
    "planned": { "level": "low", "rows": [], "areas": [] },
    "drift": [
      { "item": "impact", "planned": "ok", "now": "watch", "what": "...", "kept": "Reason, or null when lowered" }
    ]
  }
}
```

- `type` is the PR's conventional-commit type. The `visual` example shows each
  type once; a card holds at most two.
- `afterKey` is the index of the After step that is new (shown in bold).
  `evidence.series` is a short count series, oldest first; `labels` has one
  entry per value.
- Enums: `verdict` is `ok`, `watch` or `risk`; `level` is `low`, `typical`,
  `high` or `very_high` (cards written before 0.15.0 say `medium`, which
  readers treat as `typical`); `mode` is `diff` on a PR; `when` is
  `before_merge` or `after_merge`. `rows` holds each of the five rows exactly
  once.
- A drift `item` is a row key, `level`, or `area:<name>`. `planned` and `now`
  are verdicts for rows and areas and levels for `level`; for an area,
  `planned` is `"minor"` when the baseline listed it as minor and null when it
  did not list it.
- Optional: `priority`, `visual`, `evidence`, `evidence.series` with `labels`
  and `seriesLabel`, `drift`. `lower` may be empty. `planned` is null when no
  plan was rated. A `meaningful: false` area has no `verdict`.
- The card writer fills `priority` (the task source's priority, such as a
  Linear issue's, or null), `mode`, `head`, `base`, `planned`, each
  `drift[].kept`, and each area's `paths`, `add` and `del` from
  `git diff --numstat -z -M <base> <head>` (a renamed file counts under its new
  path, a binary file as 0 lines), assigning every changed file to exactly one
  area; the reviewer returns the rest.
- A card is stale when `risk.head` is not the PR's head or `risk.base` is not
  its merge base; readers say so rather than show it as current.
- Readers accept `v: 1` and `v: 2`. A `v: 1` card has a string or null
  `lower` and no `short`, `paths`, `add` or `del`; a reader shows a row's
  `line` in place of its `short`, a string `lower` as one step without a
  `when` label, and no chart for an evidence series without `labels`. A
  `v: 1` card refreshed with a new rating is written as `v: 2`; one whose head
  only moves forward keeps `v: 1`.

## Linear Block

Linear's review view reads a `linear:extension` comment from the PR and shows
the level as its risk badge with the five checks as lines under it, and the
agent as the PR's author on someone's behalf. Write it as one line after the
data block:

```markdown
<!-- linear:extension {"version":1,"plugins":[{"plugin":"riskScore","sha":"<risk.head>","level":2,"explanations":["Impact · watch: <short>"]},{"plugin":"onBehalfOf","agent":"claude"}]} -->
```

- `sha`: the full 40-character `risk.head`.
- `level`: `low` 1, `typical` 2, `high` 3, `very_high` 4.
- `explanations`: one per check in the order of `rows`, as
  `<Check> · <verdict>: <short>` with the check named as in the card's Merge
  risk table and a `v: 1` card's `line` in place of `short`, cut at a word to
  200 characters. No `areas`: Linear's badge shows the highest area level in
  place of `level`, so per-check levels would contradict the card. Linear
  drops the whole score when the entry carries a field it does not know.
- `onBehalfOf`: only when an agent wrote the change. `agent` is `claude` or
  `codex`, the host that wrote it, which is not always the host refreshing the
  card: on a refresh, keep the existing block's `agent`, and leave the plugin
  out when the author is unknown. Leave out `model`.
- Escape `>` as in the data block. Linear's format:
  <https://linear.app/docs/diffs#risk-score>.
