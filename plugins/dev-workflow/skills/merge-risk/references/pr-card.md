# PR Card

The PR card opens the PR body so a maintainer can decide in seconds, on GitHub
or in any tool that reads the PR. Its data is stored once as JSON in a hidden
comment; tools parse that, people read the rendered card. The PR title is the
card's title; do not copy it into the card.

## Managed Region

The card sits between two markers at the very top of the body:

```markdown
<!-- pr-card:start -->
...rendered card, then the data block...
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
4. **Merge risk**: the reviewer's Markdown section.
5. The data block.

## Data Block

```markdown
<!-- pr-card v1
{ ...JSON... }
-->
```

Write `>` as `>` inside JSON strings so the comment cannot end early.
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
    { "type": "message", "where": "chat", "before": "...", "after": "..." }
  ],
  "evidence": { "text": "One sentence.", "url": "https://...", "linkText": "Report", "series": [0, 3, 12] },
  "risk": {
    "mode": "diff",
    "head": "<commit SHA assessed>",
    "base": "<base commit SHA>",
    "level": "medium",
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

- `type` is the conventional-commit type; `fix` and `feat` pick their labels,
  every other value uses Why / Change / How.
- Enums: `verdict` is `ok`, `watch` or `risk`; `level` is `low`, `medium` or
  `high`; `mode` is `diff` on a PR. `rows` holds each of the five rows exactly
  once.
- A drift `item` is a row key, `level`, or `area:<name>`; for a new area
  `planned` is null.
- Optional: `visual`, `evidence`, `evidence.series`, `lower`, `drift`.
  `planned` is null when no plan was rated. A `meaningful: false` area has no
  `verdict`.
- The card writer fills `mode`, `head`, `base`, `planned` and each
  `drift[].kept`; the reviewer returns the rest.
- A card whose `risk.head` is not the PR's current head is stale; readers say
  so rather than show it as current.
