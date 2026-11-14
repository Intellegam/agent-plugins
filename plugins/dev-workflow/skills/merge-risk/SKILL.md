---
name: merge-risk
description: Rate how risky a plan or change is to merge with an independent reviewer, and write or refresh the PR card at the top of the PR body. Use before implementing PR-bound work, inside dev-review, when opening a PR, and when a PR's head changes.
---

# Merge Risk

An independent reviewer rates merge risk twice: once on the plan, before code
exists, and once on the diff. The first rating becomes the baseline; the second
shows whether the work got riskier than agreed. The result opens the PR body as
the PR card, so maintainers and tools see the same decision summary.

Use it for every PR except branch promotions, which carry already-reviewed
work. Tiny changes skip plan mode but still get a diff rating and a card.

## Reviewer

The canonical contract is `references/merge-risk-reviewer.md`. Read the shared
sub-agent model policy at `../../references/sub-agent-model-policy.md` before
launching it.

- **Claude Code**: launch the `dev-merge-risk-reviewer` agent and pass the
  target as `dev-review`'s Claude Code adapter does: it has no shell.
- **Codex**: `spawn_agent` a read-only worker with an explicit permitted model;
  pass the resolved absolute contract path and the exact diff target, and
  require fail-closed loading. Tell it not to delegate.

Use a fresh reviewer for each rating. Give it the mode, the goal, and the task
source (issue, report, or request text). It never receives the author's
argument that the change is safe. It cannot fetch CI itself: include check
results for the assessed commit, when any exist.

## 1. Plan Mode

After drafting a plan and before implementing, run the reviewer in plan mode
with the plan text. This rating is separate from the optional plan
consultation; skip it when a parent agent owns the PR. Weigh any safer approach
it names where that costs little, and include its profile in any plan
consultation. The profile you implement against is the baseline; keep it in
task context, across compaction and handoff, until the PR card records it.
Revising the plan later replaces the baseline only with the user's or plan
reviewer's agreement.

## 2. Diff Mode

Give the reviewer the same complete target the review panel gets, diffed
against the merge base, with the baseline; nothing needs to be committed yet.
Act only on its drift list, within the review budget: lower a drifted item, or
keep it and write a one-line reason in its `kept` field. A better design can
justify more risk.

The card names commits. When the change is committed, record that commit as
`head` and the merge base as `base` if nothing that changes behavior happened
since the rating; otherwise rate again.

If the reviewer cannot run or returns invalid output, write the card without
the data and Linear blocks and say in its Merge risk section that no rating was
produced; never fill in verdicts yourself.

Only the reviewer sets verdicts; never edit its rows to look better.

## 3. PR Card

The main agent writes the PR title and body, card included, from the spec at
`../../references/pr-card.md`; the reviewer supplies only the `risk` data.
Write the card when opening the PR.

Freshness: before writing or refreshing the card, compare the assessed `head`
and `base` with the PR's head and merge base. A new merge base from retargeting
or a base merge that changes the diff needs a new rating. If any commit since
the assessed head changes behavior (review fixes included), rerun diff mode
first. Only when the commits since change no behavior (docs, comments, a clean
rebase) may the writer move `head` and `base` forward without a new rating.

To update a body: fetch the latest body, replace only the managed region, and
write once. Reread the body just before writing; if it changed, redo the
replacement on the new body.

## 4. Refresh

While babysitting, check the card's freshness against the PR head on every
pass, whoever pushed, and rewrite the card when it is stale. Rate the PR's head
commit (fetch it when it is not local) without changing the checkout, and use
the card's `risk.planned` as the baseline, keeping it in the rewritten card.
Drift found here is reported on the card, not fixed in a new loop, unless the
user asks.
