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

## Rendered Card

1. **Why / What / How**: one or two sentences each, labelled by the PR's
   conventional-commit type: `fix` → Problem / Fix / How; `feat` → Need /
   Feature / How; any other type → Why / Change / How. Write for someone who
   has not read the code.
2. **Visual** (optional, at most two): render `flow` as a Mermaid
   `flowchart LR` with a Before and an After lane, `numbers` as a before/after
   table, `message` as two quoted lines. Add one only when it explains the
   change faster than the sentences.
3. **Evidence** (optional): one sentence on what showed the problem or proves
   the change, with a link.
4. **Merge risk**, rendered from `risk`:

   ```markdown
   ### Merge risk: Typical

   | | Row | Why |
   | --- | --- | --- |
   | ✓ | Alignment | ... |
   | 👀 | Impact | ... |

   **Areas:** 👀 `agent-runtime`: ... · ✓ `access`: ... · minor: `core` (...)

   **To lower it:** ...

   **Riskier than planned:** ... Kept because ...
   ```

   Write the level as Low, Typical, High or Very high. Use ✓ for `ok`, 👀 for
   `watch` and ⚠ for `risk`. Omit "To lower it" when `lower` is null, and "Riskier
   than planned" when `drift` is empty; with `planned` null, write "no plan
   profile" there instead.
5. The data block and the Linear block, only when the reviewer returned a
   valid rating.

## Data Block

```markdown
<!-- pr-card v1
{ ...JSON... }
-->
```

Escape every `>` inside JSON strings as `\u003e`, so no string can contain
`-->` and end the comment early.
Readers ignore a block whose `v` they do not know and treat malformed JSON as
no card.

```json
{
  "v": 1,
  "type": "fix",
  "why": "One or two sentences.",
  "what": "One or two sentences.",
  "how": "One or two sentences.",
  "visual": [
    { "type": "flow", "title": "How it works", "before": ["Step", "Fails"], "after": ["Step", "Works"], "afterKey": 1 },
    { "type": "numbers", "caption": "...", "rows": [{ "label": "...", "before": "...", "after": "..." }] },
    { "type": "message", "where": "error toast", "before": "...", "after": "..." }
  ],
  "evidence": { "text": "One sentence.", "url": "https://...", "linkText": "Report", "series": [0, 3, 12] },
  "risk": {
    "mode": "diff",
    "head": "<commit SHA assessed>",
    "base": "<merge-base SHA>",
    "level": "typical",
    "rows": [
      { "row": "alignment", "verdict": "ok", "line": "..." },
      { "row": "impact", "verdict": "watch", "line": "..." },
      { "row": "verification", "verdict": "ok", "line": "..." },
      { "row": "rollback", "verdict": "ok", "line": "..." },
      { "row": "error_detection", "verdict": "watch", "line": "..." }
    ],
    "areas": [
      { "name": "access", "meaningful": true, "verdict": "watch", "note": "One sentence." },
      { "name": "core", "meaningful": false, "note": "One sentence." }
    ],
    "lower": "One or two steps, or null.",
    "planned": { "level": "low", "rows": [], "areas": [] },
    "drift": [
      { "item": "impact", "planned": "ok", "now": "watch", "what": "...", "kept": "Reason, or null when lowered" }
    ]
  }
}
```

- `type` is the PR's conventional-commit type. The `visual` example shows each
  type once; a card holds at most two.
- `afterKey` is the index of the After step that is new (shown in bold);
  `evidence.series` is a short count series for a sparkline, oldest first.
- Enums: `verdict` is `ok`, `watch` or `risk`; `level` is `low`, `typical`,
  `high` or `very_high` (cards written before 0.15.0 say `medium`, which
  readers treat as `typical`); `mode` is `diff` on a PR. `rows` holds each
  of the five rows exactly once.
- A drift `item` is a row key, `level`, or `area:<name>`. `planned` and `now`
  are verdicts for rows and areas and levels for `level`; for an area,
  `planned` is `"minor"` when the baseline listed it as minor and null when it
  did not list it.
- Optional: `visual`, `evidence`, `evidence.series`, `lower`, `drift`.
  `planned` is null when no plan was rated. A `meaningful: false` area has no
  `verdict`.
- The card writer fills `mode`, `head`, `base`, `planned` and each
  `drift[].kept`; the reviewer returns the rest.
- A card is stale when `risk.head` is not the PR's head or `risk.base` is not
  its merge base; readers say so rather than show it as current.

## Linear Block

Linear's review view reads a `linear:extension` comment from the PR and shows
the level as its risk badge and the agent as the PR's author on someone's
behalf. Write it as one line after the data block:

```markdown
<!-- linear:extension {"version":1,"plugins":[{"plugin":"riskScore","sha":"<risk.head>","level":2,"explanations":["..."]},{"plugin":"onBehalfOf","agent":"claude"}]} -->
```

- `level`: `low` 1, `typical` 2, `high` 3, `very_high` 4.
- `explanations`: the lines of rows that are not `ok`, riskiest first, then
  `lower` when set; the Impact line when every row is `ok`. At most 8, each cut
  to 200 characters.
- `onBehalfOf`: only when an agent wrote the change. `agent` is `claude` or
  `codex`, the host writing the card; leave out `model`.
- Escape `>` as in the data block. Linear's format:
  <https://linear.app/docs/diffs#risk-score>.
