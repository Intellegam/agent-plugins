---
name: babysit-pr
description: This skill MUST be used after the Code Tour phase has been handled for a newly created PR, and after any update to an existing PR. Triage review comments and CI failures until the PR is merged, closed, or needs a user decision. Also use when the user asks to babysit or triage a PR, handle review comments, resolve threads, fix CI, or report what a reviewer said.
---

# Babysit PR

## Dev Workflow

This is the post-tour PR step:

`dev-check` → `dev-review` → `dev-sync` → PR created → optional Code Tour → **`babysit-pr`**.

Invoke `/dev-workflow:babysit-pr` in Claude Code or
`$dev-workflow:babysit-pr` in Codex. Requires authenticated `gh` and Python 3.

## Load the host adapter

Resolve this skill's announced base directory, then read exactly one adapter
completely before acting:

- Claude Code: `references/claude-code.md`
- OpenAI Codex: `references/codex.md`

The adapter defines only how this host owns the waiter and attributes replies.
This file is the sole source of behavioral policy. If the host cannot be
identified or the adapter cannot be read, stop and report the problem; do not
guess or silently fall back.

Read every applicable `AGENTS.md` and `CLAUDE.md`. Use triage notes from
whichever guidance file defines the **Dev Workflow Plugin** section.

## Rule: verify before fixing

Reviewer findings, whether automated or human, are hypotheses. Before acting:

1. Read the claim and cited code.
2. Prove or disprove it with a targeted test, reproducer, code trace, or
   counterexample. If evidence is unavailable, ask the user instead of fixing
   on suspicion.
3. Classify it and take only the corresponding action below.

## Process

### 1. Establish scope, arm, then fetch

Resolve the current PR and verify all of these before mutating anything:

```bash
pr=$(gh pr view --json number -q .number)
gh pr view "$pr" --json author,isCrossRepository,isDraft,headRefName,baseRefName
gh api user --jq .login
```

- Stop on an author mismatch unless the user explicitly authorized this PR.
- Cross-repository PRs are unsupported because the scripts resolve the current
  repository. Stop if `isCrossRepository` is true.
- Skip draft PRs; review bots generally do not review them.
- Never push to the base branch. Fixes go only to the PR head branch.

**Arm first, fetch second.** Start the retained one-shot waiter exactly as the
host adapter specifies:

```bash
cd <repo-root> && python3 "<skill-base>/scripts/await_pr_event.py" "$pr"
```

Retain its task/process handle. An untracked background process is not a
waiter. A non-zero exit means monitoring failed, never that the PR is quiet.
Wait until the process emits `armed` before fetching PR state; this confirms
its baseline exists and closes the launch-versus-fetch race.
Keep exactly one waiter. Before replacing an armed waiter—for example directly
after a push—terminate it through the host adapter unless its event has already
been consumed, then arm the replacement before fetching again.
If the waiter cannot be armed or its handle retained, stop and report that
event-driven monitoring is unavailable; do not substitute in-turn polling.

After arming, fetch all current state:

```bash
python3 "<skill-base>/scripts/fetch_open_threads.py" "$pr"
gh pr checks "$pr"
gh pr view "$pr" --json state,mergeable,mergeStateStatus,reviewDecision,latestReviews,comments,reactionGroups,headRefOid
```

If a code tour is known to exist, retain its source head SHA and raw-diff
SHA-256 fingerprint plus the set of snapshot identities for which a refresh was
already offered in task context, and preserve them across compaction or
handoff. Compare the tour head with the fetched `headRefOid` on every pass; do
not depend only on observing a `new-head` event, because the waiter may baseline
after a push. At a clean milestone, export the current raw PR diff with the
code-tour skill's canonical `gh pr diff <N> --repo owner/name` form and compare
its SHA-256 fingerprint too; this catches a retargeted PR or changed merge base
without a new head. If either retained source value cannot be recovered, treat
freshness as unknown instead of current. If the current diff cannot be exported
and fingerprinted, stop and report a monitoring blocker rather than offering or
re-arming with an identity that cannot be recorded.

The waiter first emits `armed`, then emits one terminal event and exits:

- `review-activity` — reviews changed
- `review-thread-activity` — inline review-thread replies or resolution changed
- `conversation-activity` — top-level PR comments changed
- `reaction` — PR reactions changed; Codex may use 👍 as an all-clear
- `new-head` — a commit was pushed
- `ci-failure` — a check entered a failing bucket
- `ci-concluded` — all checks concluded
- `merge-state` — mergeability or review-decision state changed
- `pr-closed` — merged or closed
- `quiet` — no event for 30 minutes; reassess, but do not treat silence as approval

Every event except `pr-closed` re-enters this step: re-arm first, then fetch and
triage. On `pr-closed`, stop the waiter and report the final state.

### 2. Verify and classify findings

| Class | Meaning | Action |
| --- | --- | --- |
| `already-addressed` | A prior commit fixed a stale claim | Reply with commit/test evidence; resolve bot threads only |
| `false-alarm` | The claim does not match reality | Reply with empirical disproof; resolve bot threads only |
| `real-fix-obvious` | Clear, small, self-contained bug | Fix and test; batch with other obvious fixes; push once; reply with evidence |
| `real-fix-nonobvious` | Real issue with ambiguous or broad fix | Ask the user; keep thread open; stop until decided |
| `judgment-call` | Subjective product or style tradeoff | Ask the user; keep thread open; stop until decided |

Batch obvious fixes into one commit and one push per pass so reviewers rerun
once against the combined change. Immediately replace the waiter after pushing
and before fetching the new head's state.

Immediately before every commit and push, refetch the PR head/base names and
verify that local `HEAD` is attached to the PR head branch, is not the base
branch, and still tracks a remote for this repository. Stop on any mismatch.
Push explicitly to the verified remote and ref, for example
`git push "$remote" "HEAD:refs/heads/$head"`; never rely on an implicit push
destination during a long-lived task.

### 3. Diagnose CI before retrying

Review feedback first. If a fix commit is needed, push it instead of wasting a
rerun on the old SHA.

For each failing GitHub Actions job, inspect job-level logs even while sibling
jobs still run:

```bash
gh run view <run-id> --json jobs,status,conclusion,url
gh api repos/{owner}/{repo}/actions/runs/<run-id>/jobs --paginate
gh api repos/{owner}/{repo}/actions/jobs/<job-id>/logs > /tmp/babysit-pr-<job-id>.log
```

If direct job logs are unavailable, use `gh run view <run-id> --log-failed`
after the run concludes. For non-GitHub providers, inspect the check's details
URL and report what is observable.

Classify each failure:

- `our-bug` — caused by this change: apply the same obvious versus non-obvious
  boundary as review findings; fix/test only an obvious issue and ask the user
  before an architectural, migration, or product decision.
- `flaky` — intermittent test or unrelated transient infrastructure: rerun.
- `external-dep` — transient dependency outside the PR: report and monitor.
- `infra` — credentials, configuration, or runner problem: report to the user.

Retry likely flaky failures at most three times per head SHA. Reset the budget
only when the head SHA changes. Preserve the count in task context and, after a
handoff or uncertain continuity, inspect workflow attempts before rerunning so
the budget cannot silently reset.

Before rerunning, inspect the workflow and dependent jobs. Automatically rerun
only side-effect-free checks. A job or dependency that deploys, publishes, or
otherwise mutates an external system requires user approval. If the third retry
still fails, stop as a user-help-required blocker and report all attempts and
evidence; do not re-arm into an endless quiet loop.

### 4. Reply automatically; resolve deliberately

For every finding with a verified, clear disposition, reply automatically. Do
not ask for separate approval merely because the author is human. Prefix the
reply exactly as required by the host adapter and cite a commit SHA, test name,
reproducer, or counterexample.

```bash
python3 "<skill-base>/scripts/reply_and_resolve.py" "$THREAD_ID" "<attributed evidence-backed reply>"
```

For a top-level conversation comment or a review summary with no thread, post
the attributed disposition on the PR instead:

```bash
gh pr comment "$pr" --body "<attributed evidence-backed reply>"
```

- Bot-authored thread with clear disposition: reply and resolve.
- Human-authored thread with clear disposition: reply automatically using
  `--no-resolve`; leave resolution to the maintainer.
- `real-fix-nonobvious` or `judgment-call`: do not post a substantive answer
  before the user decides. After the decision, reply automatically with the
  resulting disposition; keep a human thread unresolved.

Before posting, check the existing thread or conversation so a resumed task
does not duplicate a reply that already landed.

If the same finding reappears after a reply, escalate to the user rather than
repeating the same response.

### 5. Assess all feedback and readiness

Inline review threads are only one feedback surface. On every pass inspect:

1. Open review threads from `fetch_open_threads.py`.
2. Latest review bodies, including `COMMENT` and `REQUEST_CHANGES` summaries.
3. Top-level conversation comments. Read all on the first pass; on later passes
   still ensure no older actionable comment was missed.
4. Reactions. Before treating 👍 as Codex's all-clear, query reaction authors
   and confirm the review bot reacted after the latest push:

   ```bash
   gh api graphql -f query='query($owner:String!,$repo:String!,$pr:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){reactions(first:20){nodes{content createdAt user{login}}}}}}' -F owner='{owner}' -F repo='{repo}' -F pr="$pr" --jq '.data.repository.pullRequest.reactions.nodes'
   ```

For the current head, report reviewer state as `reviewed-clean`, `reacted 👍`,
or `not observed`. Silence and `quiet` are not approval.

A PR is a clean milestone only when:

- no actionable feedback remains and no user decision is pending;
- CI is successful, or the user explicitly accepted a non-blocking failure;
- `mergeable` is positively `MERGEABLE`, `mergeStateStatus` has no blocking
  state, and `reviewDecision` has no blocking review. `UNKNOWN` is not clean.

If a known code tour's source head or raw-diff fingerprint differs from the
current snapshot, or its freshness is unknown, offer one refresh at that
snapshot's first clean milestone before reporting the milestone and re-arming.
Record the current `(head SHA, diff SHA-256)` identity in the offered set before
asking so a resumed turn cannot duplicate the offer. If refreshed, update both
retained source values. If declined, do not offer again for that snapshot; a
later head or diff gets one new offer. Do not rebuild after every change. Return
to the top-level Code Tour phase for the refresh so generation, publication,
and PR-comment authorization remain owned by the code-tour skill.

Being clean and mergeable is progress, not permission to merge and not a stop
condition while the PR remains open. Report the milestone and re-arm.

If the repository has no CI checks, the empty check set satisfies the CI gate,
but report `no checks configured` rather than claiming a successful check run.

### 6. Continue until terminal

Keep the skill active using the host adapter. Stop only when:

- the PR is merged or closed;
- a non-obvious fix, judgment call, infrastructure problem, merge conflict, or
  other blocker requires user help;
- the user explicitly asks to stop.

When stopping, terminate the retained waiter as specified by the host adapter.
Report findings by class, commits pushed, replies made, unresolved threads and
why, CI, mergeability/review decision, and reviewer status for the current SHA.

## Related skills

- `dev-review` — local review before pushing; shares verify-before-fixing.
- `dev-sync` — documentation alignment before creating or updating a PR.
