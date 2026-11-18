# PR Card

The PR card opens the PR body so a maintainer can decide in seconds, on GitHub,
in Linear, or wherever the PR body is read. It is plain markdown that the main
agent writes from the reviewer's rating (the Output section of
`../skills/merge-risk/references/merge-risk-reviewer.md`) plus a few facts it
fills in itself. The PR title is the card's title; do not copy it into the
card.

## Managed Region

The card sits between two markers at the very top of the body:

```markdown
<!-- pr-card:start head=<head SHA> base=<merge-base SHA> -->
...card, then the Linear block...
<!-- pr-card:end -->
```

`head` and `base` are the full SHAs of the commit the card describes (the
assessed commit, or the commit the `merge-risk` skill's Freshness rule moved it
to) and its merge base. A card is stale when its `head` is not the PR's head or
its `base` is not the PR's merge base, or when its marker has neither (a card
written before dev-workflow 0.17.0). A marker that also carries `ci=failed`
(after `base`) holds a rating that included a CI failure on its head.

Everything after the end marker belongs to the repository's PR template or the
detailed description and is never rewritten by card updates. The region is
agent-managed: rewrite it whole on every update, and put human notes below
it. On a refresh, carry over from the old card the ticked steps with the same
timing and text, each drift item's Kept because reason while its Planned and Now are unchanged, and the Linear block's `agent`;
everything else comes from the new rating. A body with more than one region is
invalid.

When opening a PR, put two `---` lines after the end marker and fold the detailed
description (template sections included) into
`<details><summary><b>Full description</b></summary>` … `</details>`, so the
card is what a reader sees first. Leave sections a bot rewrites between its own
markers, such as CodeRabbit's summary, after the fold.

## Card

The card uses only GitHub-flavoured markdown, a little HTML, and Mermaid, so it
also reads in Linear and in email. It leaves out what GitHub already shows,
such as the PR's total size and file count. Icons: ✅ `ok`, 👀 `watch`, ⚠️
`risk`. Pills are `<kbd>` elements; GitHub's pill style overrides bold around
one, so bold goes inside it. A `---` line, with a blank line before and after
it (without one GitHub turns the paragraph above into a heading), separates
four parts: header and
Why / What / How; visual and evidence; merge risk through the plan line;
Touches and footer. An empty part gets no line.

1. **Header**: the level as a four-dot meter in a pill, then the priority in
   a pill when the PR's linked Linear issue has one, named as Linear names it
   (`Urgent`, `High`, `Medium`, `Low`):

   ```markdown
   <kbd>●●○○ Typical risk</kbd> <kbd>High</kbd>
   ```

   Meters: `low` ●○○○ Low risk, `typical` ●●○○ Typical risk, `high` ●●●○
   High risk, `very_high` ●●●● Very high risk. Without a rating
   the first pill reads `Not rated`, Merge risk holds only the line that no
   rating was produced, and parts 6 to 10 are left out.
2. **Why / What / How**: one paragraph each, led by a pill label and a blank
   line between them. Labels follow the PR's conventional-commit type: `fix` →
   Problem / Fix / How; `feat` → Need / Feature / How; any other type → Why /
   Change / How. The first two are one short sentence each; How may take two
   or three. Write for someone who has not read the code.

   ```markdown
   <kbd>Problem</kbd> &nbsp;Recovery replaced healthy queued work during long ingestions.

   <kbd>Fix</kbd> &nbsp;A request no worker has claimed is replaced only after the queue's timeout.

   <kbd>How</kbd> &nbsp;...
   ```

3. **Visual** (optional, at most two), each under a short `####` heading;
   add one only when it explains the change faster than the sentences.
   - Flow: a Mermaid `flowchart LR` fork of the steps before and after the
     change. The leading steps both paths share are drawn once, plain, with
     the last one as a `{{...}}` decision node; from it, a `before` edge runs
     through the rest of the old path in red and an `after` edge through the
     rest of the new path in green, with the step that is new in bold. The
     shared part stops before the shorter path's last step, so each branch keeps at least one step; paths that do
     not differ get no flow. Both paths hold at least one step: a process
     that is new or removed gets a single `"None"` step on its empty side.
     Without a shared step, draw the two paths as separate rows. Classes: plain `fill:#f6f8fa,stroke:#d1d9e0,color:#1f2328`,
     red `fill:#ffebe9,stroke:#cf222e,color:#82071e`, green
     `fill:#dafbe1,stroke:#1a7f37,color:#116329`. Quote every label.
   - Numbers: a `| | Before | After |` table with each After value bold.
   - Message: a `diff` code block, `- ` before and `+ ` after, under a heading
     that says where the message appears.
4. **Evidence** (optional): a quote, `> **Evidence** · <one sentence> [<link text> ↗](<url>)`.
   When a short count series (oldest first) shows the problem, add a Mermaid
   `xychart-beta` bar chart below it, titled with what it counts, one x-axis
   label per value, and the y-axis labels and ticks hidden. Quote labels that
   contain spaces.
5. **Merge risk** under `#### Merge risk`: one row per check in the rating's
   order, with its `short`; a row that is not `ok` is bold.

   ```markdown
   | | Check | In short |
   | :---: | :--- | :--- |
   | ✅ | Alignment | Inside the existing Mistral stack |
   | 👀 | **Verification** | **16 pages is a guess, not tried on real files** |
   ```

   Below it, `<details><summary>Full reasons</summary>` holds the same table
   with `| | Check | Why |` and each row's `line`, rows that are not `ok`
   first.
6. **To lower it** (when the rating's `lower` is not empty): a bold label,
   then a task list, `- [ ] **Before merge:** ...` or
   `- [ ] **After merge:** ...` per step.
7. **Riskier than planned**: when the rating has drift, a
   `| Riskier than planned | Planned | Now | Kept because |` table whose first
   cell is the item (the check's name, `Overall level`, or the area's name),
   a colon and its `what`, with icons for verdicts, level names for the
   level, `minor` or `–` for an area the baseline listed as minor or did not
   list. The last cell holds the implementer's one-line reason for keeping
   it, or `open` while the drift is neither lowered nor explained. Without
   drift, one line:
   `<sub>Matches the planned risk profile.</sub>`, or
   `<sub>No plan baseline for this rating.</sub>` when it was rated without
   one.
8. **Touches** under `#### Touches <sub>▰ = 100 lines</sub>`: one fold per
   area, in the reviewer's order.

   ```markdown
   <details><summary><code>▰▰▰▰▱▱▱▱▱▱</code> &nbsp;<kbd><b>apps/processing</b></kbd> &nbsp;👀</summary>

   <sub><code>+289 −65</code> lines in 7 files</sub>

   Recovery now replaces a never-claimed request only after the queue's timeout.

   <sub><code>file_recovery.py</code>, <code>results.py</code> +5 more</sub>

   </details>
   ```

   The writer counts lines with `git diff --numstat -z -M <base> <head>` (a
   renamed file counts under its new path, a binary file as 0 lines) and
   assigns every changed file to exactly one of the reviewer's areas. The bar
   has ten cells, one filled per started 100 added plus deleted lines (at
   least one, at most ten). An area with no changed lines (only binary files,
   pure renames or empty files) has an empty bar, and its fold says
   `<sub>No line changes in N files</sub>` in place of the count. A
   meaningful area's name is bold inside its pill and followed by its icon; a
   minor area has neither. The fold holds the line count, the area's `note`,
   and its file names (the last path segment, in code spans, at most five,
   then `+N more`).
9. **Footer**: `<sub>Overview as of <code>` + the first 7 characters of the
   start marker's `head` + `</code> · updated after every push</sub>`; leave it out
   without a rating.
10. The Linear block, only when the reviewer returned a valid rating.

Escape `|` as `\|` inside table cells, and `"` as `#quot;` inside Mermaid
labels. Every `<details>` fold has a blank line after `</summary>` and before
`</details>`, or GitHub shows its markdown as plain text.

## Linear Block

Linear's review view reads a `linear:extension` comment from the PR and shows
the level as its risk badge with the five checks as lines under it, and the
agent as the PR's author on someone's behalf. Write it as one line after the
card:

```markdown
<!-- linear:extension {"version":1,"plugins":[{"plugin":"riskScore","sha":"<head>","level":2,"explanations":["Impact · watch: <short>"]},{"plugin":"onBehalfOf","agent":"claude"}]} -->
```

- `sha`: the start marker's full `head`.
- `level`: `low` 1, `typical` 2, `high` 3, `very_high` 4.
- `explanations`: one per check in the rating's order, as
  `<Check> · <verdict>: <short>` with the check named as in the card's Merge
  risk table, cut at a word to 200 characters. No `areas`: Linear's badge shows the highest area level in
  place of `level`, so per-check levels would contradict the card. Linear
  drops the whole score when the entry carries a field it does not know.
- `onBehalfOf`: only when an agent wrote the change. `agent` is `claude` or
  `codex`, the host that wrote it, which is not always the host refreshing the
  card; leave the plugin out when the author is unknown. Leave out `model`.
- Escape every `>` inside the JSON as `\u003e`, so no string can end the
  comment early. Linear's format:
  <https://linear.app/docs/diffs#risk-score>.

## Chat Card

A compact review card the agent shows in its own chat reply, so the user can
judge a PR without opening it. Show it after opening a PR, after rewriting its
card, and when reporting a PR's state; build it from the PR card and live PR
state. Several PRs in one reply share one card, riskiest first.

### HTML Card

Where the host renders inline HTML in chat and runs its scripts (a widget
tool such as `show_widget`), post `chat-card.html` whole and change only the JSON in its
`cc-data` script, with every `<` written as `\u003c`. Leave out a field you do
not have. The card cannot fetch anything, so its values are a snapshot of the
moment it is posted.

```json
{"checkedAt": "06:45", "prs": [{
  "ref": "plugins#44", "type": "feat(dev-workflow)", "title": "Add chat review cards",
  "url": "<PR URL>", "linear": "<Linear review URL>", "issue": {"key": "DEV-228", "url": "<issue URL>"},
  "level": "typical", "added": 180, "deleted": 186,
  "state": {"label": "Ready to merge", "tone": "ok", "checks": [{"verdict": "ok", "name": "CI", "text": "All checks green"}]},
  "summary": "<the card's second sentence>",
  "checks": [{"verdict": "watch", "name": "Impact", "short": "<short>"}],
  "lower": ["<unticked step>"],
  "areas": [{"name": "references", "added": 112, "deleted": 156, "verdict": "watch", "note": "<note>"}],
  "how": {"before": ["<step>"], "beforeEnd": "<old outcome>", "after": ["<step>"], "afterEnd": "<new outcome>"}
}]}
```

- `checkedAt`: the user's local time when the PR state was read.
- `ref`, `type`, `title`: `repo#number`, the PR title's conventional-commit
  prefix, and the rest of the title.
- `linear`: Linear's review page for the PR, when known; `issue`: the linked
  Linear issue.
- `level`: the rating's level, or `null` without a rating; `added` and
  `deleted`: the PR's totals.
- `state`: one label for what decides the next step (`Ready to merge`,
  `Draft`, `CI failing`, `CI running`, `Open threads`, `Card is stale`,
  `Blocked`), its tone, and the facts behind it (CI, unresolved threads,
  card freshness, draft), each with a verdict.
- `checks`, `lower`, `areas`: the rating's checks in order, the unticked To
  lower it steps, and the Touches areas with their line counts; an area's
  `verdict` is its icon's verdict, `null` for a minor area.
- `how`: only when the card has a Flow visual; its old and new paths, each
  with its last step as the outcome.

### Markdown Card

Everywhere else, write markdown, one paragraph per line so no renderer joins
them:

```markdown
**[#1442 feat(files): raise the pdf upload limit to 1 gb](<PR URL>)** · `●●○○ Typical risk` · `+5 −5`

The upload check allows PDFs up to 1 GB.

CI ✅ · 0 open threads · draft

⚠️ Impact: must not merge before the Python 1 GB cap is live
```

- Line 1: the PR number and title linked to the PR, the meter and level name
  as a code-span pill (`Not rated` without a rating), and the PR's total added
  and deleted lines.
- Line 2: the card's second sentence (Fix, Feature or Change). A PR without a
  card shows `Not rated` on line 1 and skips line 2 and the check lines.
- Line 3: CI as ✅, ❌, ⏳ or `no checks`, the number of unresolved review threads, and
  `draft` and `stale card` when they apply.
- Then one line per check that is not `ok`, riskiest first, with its icon,
  name and `short`; none when every check is `ok`.

Several PRs get one table instead, with `draft` and `stale card` under State:

```markdown
| PR | Change | Risk | Lines | CI | Threads | State |
| :--- | :--- | :--- | ---: | :---: | ---: | :--- |
| [#1442](<PR URL>) feat(files): raise the pdf upload limit | The upload check allows PDFs up to 1 GB. | `●●○○ Typical` | +5 −5 | ✅ | 0 | draft |
```
