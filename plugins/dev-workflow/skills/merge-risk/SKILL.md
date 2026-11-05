---
name: merge-risk
description: Rate how risky a plan or change is to merge with an independent reviewer, and write or refresh the PR card at the top of the PR body. Use before implementing PR-bound work, inside dev-review, when opening a PR, and when a PR's head changes.
---

# Merge Risk

An independent reviewer rates merge risk twice: once on the plan, before code
exists, and once on the diff. The first rating becomes the baseline; the second
shows whether the work got riskier than agreed. The result opens the PR body as
the PR card, so maintainers and tools see the same decision summary.

Use it for work that will become a PR. Skip it for tiny changes and for
branch-promotion PRs, which carry already-reviewed work.

## Reviewer

The canonical contract is `references/merge-risk-reviewer.md`. Read the shared
sub-agent model policy at `../../references/sub-agent-model-policy.md` before
launching it.

- **Claude Code**: launch the `dev-merge-risk-reviewer` agent.
- **Codex**: `spawn_agent` a read-only worker with an explicit permitted model;
  pass the resolved absolute contract path and require fail-closed loading.
  Tell it not to delegate.

Use a fresh reviewer for each rating. Give it the mode, the goal, and the task
source (issue, report, or request text). It never receives the author's
argument that the change is safe. It cannot fetch CI itself: include check
results for the assessed commit, when any exist.

## 1. Plan Mode

After drafting a plan and before implementing, run the reviewer in plan mode
with the plan text. Weigh any safer approach it names where that costs little,
and include its profile in plan validation. The profile you implement against
is the baseline; keep it in task context, across compaction and handoff, until
the PR card records it. Revising the plan later replaces the baseline only with
the user's or plan reviewer's agreement.

## 2. Diff Mode

`dev-review` runs this beside its panel. Give the reviewer the review target and
the baseline. Act only on its drift list, within the review loop's existing
budget:

- Lower a drifted item, or keep it and write a one-line reason in the item's
  `kept` field. A better design can justify more risk.
- Equal or lower risk needs no action.

Only the reviewer sets verdicts; never edit its rows to look better. After fixes
that change behavior, rerun it so the profile describes the reviewed commit.

## 3. PR Card

Follow `references/pr-card.md`. Write the card when opening the PR. Before
writing, check that the assessment's `head` and `base` match what is being
published; otherwise rerun diff mode first. `dev-sync` edits after review count
when they change behavior.

To update a body: fetch the latest body, replace only the managed region, and
write once. Keep everything outside the region, including template sections
and checklists.

## 4. Refresh

While babysitting, compare the card's `head` with the PR head on every pass,
whoever pushed. When it differs and the change since the assessment alters
behavior, rerun diff mode and rewrite the card; otherwise update only `head`.
When CI for the current head fails, rerun diff mode with that evidence. Refresh
at most once per head. Drift found here is reported on the card,
not fixed in a new loop, unless the user asks.
