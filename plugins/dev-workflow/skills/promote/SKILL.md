---
name: promote
description: Prepare, open, merge, and verify GitHub branch-promotion PRs using repository-owned promotion policy. Use when the user asks to promote staging, dev, or a release branch to production or main; create, merge, or assess a promotion PR; or cut, deploy, or ship a release through a branch-promotion PR.
---

# Promote

Promote an already-staged branch through GitHub without checking it out locally. Treat repository policy as authority for intent and live repository/GitHub state as authority for mechanics.

This workflow is GitHub-only. It verifies promotion and release evidence visible in GitHub; it does not prove that an external deployment target is healthy.

## Invariants

- Keep the entire assessment and review read-only. Do not edit code, add TODOs, create fix branches, reconcile branches, or mutate repository settings.
- Never check out, merge, rebase, or push either promotion branch locally.
- PR creation or update does not authorize merging. Obtain a separate approval for the exact PR after presenting the final gate.
- Never infer branch names, merge strategy, release semantics, or deployment health.
- Stop when policy and live configuration materially disagree. Report both sources instead of choosing one silently.

## 1. Load the Promotion Contract

Read every applicable `AGENTS.md` and `CLAUDE.md`. Under the repository's Dev Workflow Plugin guidance, locate an explicit line in this form:

```markdown
- **Promotion policy**: `docs/path.md#optional-anchor`
```

Resolve paths from the repository root. Collect every promotion-policy pointer present in the applicable guidance at a given SHA, count symlinked copies of one physical guidance file once, and require all distinct pointers to identify the same normalized repository-relative policy path and anchor. Stop with a policy conflict when distinct pointers remain. Reject absolute paths, parent-directory escapes, missing targets, symlink cycles, and physical targets outside the repository. When the pointer includes an anchor, require a matching heading in the policy document.

Read guidance and policy from the exact remote source SHA being promoted, not whichever files happen to be in the working tree. Also compare the target SHA's policy when it exists, and inspect release configuration at both SHAs; the source version describes the tree that will run after merge. If this promotion changes its policy pointer, policy document, or release configuration, make that an explicit risk surface and stop on any unresolved contradiction. A load-bearing contract covers:

- source and target branch roles
- promotion PR title convention
- required promotion gates and the intended merge method
- release triggering, conditional no-release cases, the relevant tag namespace, and either the expected tagged commit or the live configuration that deterministically defines it
- what GitHub evidence proves, and which deployment surfaces remain outside verification

Also inspect the live mechanisms that can confirm or contradict the contract: release workflows, version/release configuration, package manifests, and GitHub branch/PR state. Keep intentional policy in the normal documentation; do not copy it into agent guidance.

For a read-only readiness assessment, an explicit policy supplied by the user in the current session may substitute for a missing pointer. Echo the temporary assumptions in the report. Creating/updating a PR or merging requires the committed pointer and its target to exist. If the contract is missing or insufficient, stop and offer `dev-workflow:setup`; do not discover and guess a release policy from scattered files. If the repository instead defines a direct tag, manual workflow, or other non-PR release path, name that path and stop; this skill must not execute it.

## 2. Establish Authorization

Map the request to the narrowest authorized stage:

- **Assess/readiness/review**: run through the release decision only.
- **Create or update the promotion PR**: assess, then create or update that PR. Do not merge.
- **Promote/ship/release**: assess and prepare the PR, then stop at the separate merge gate.
- **Merge this exact ready PR**: still revalidate and present the gate before asking for approval unless the user approved that exact merge after seeing an equivalent current gate.

If the requested action is ambiguous, default to assessment. External deployment, rollback, branch reconciliation, and repository-setting changes require their own explicit authorization and are outside this skill.

## 3. Remote-Only Preflight

Use authenticated GitHub tooling and remote refs. Do not switch the working tree.

1. Resolve the GitHub repository and establish a complete evidence source. When using local Git objects, fetch/prune the source and target refs plus the required tags, detect shallow or otherwise incomplete history, and deepen/unshallow it as needed. Use GitHub-native commit, comparison, tag, and release evidence instead when it is complete. Return `HOLD` before computing promotion evidence if required ancestry or tag objects cannot be proven complete.
2. Record source and target remote head SHAs, their merge base, and commits unique to each side.
3. Inspect the complete source-vs-target three-dot diff, diff stat, and no-merges commit history for commit attribution.
4. Separately compute the prospective result for the documented merge method without changing refs or the working tree, using a GitHub test-merge result whose parents match the exact recorded heads or equivalent read-only Git plumbing. Diff the current target tree against that result and use this net delta as the authoritative promotion and release-review surface. Reconcile differences from the three-dot diff against expected prior promotions or target-only release commits; return `HOLD` when the prospective result cannot be computed reliably or the difference is unexplained.
5. Inspect open and closed promotion PRs for the same head/base before considering creation.
6. Record the current release baseline: the latest tag/release relevant to this product, its dereferenced commit SHA, and the release tool's complete configured commit range. Include commits left unreleased by earlier no-release or failed runs; the current promotion diff alone is not enough to predict the next release.
7. Compare branch topology with the documented policy.

Classify target-only history before deciding that there is nothing to promote. Do not treat a nonzero target-unique count as an automatic blocker: prior promotion merges, squash/rebase equivalents, and release-generated commits can remain unique to the target. Classify them as expected only when policy and history prove their provenance and the prospective result either contains their introduced changes or intentionally preserves their target-only changes. For a prior merge-commit promotion, require its promoted-source parent to be an ancestor of the current source; for squash/rebase equivalents, require patch-equivalent changes. If the target has other unique content, histories are unrelated, or either head changes during assessment, stop and report the divergence. Never resolve it inside this workflow. Only after this classification succeeds, report `NOTHING TO PROMOTE` when the prospective net delta is empty and every source-unique commit is either absent or proven already represented and accounted for by a release or valid no-release outcome on the target; otherwise continue because history alone may affect the configured release.

Summarize the release surface by theme, not only commit titles. Call out migrations, data/storage changes, authentication/authorization, public APIs, dependency or lockfile changes, infrastructure, and release-configuration changes.

## 4. Independent Release Review

Review the full promotion diff without modifying it:

1. Run one independent broad pass with the opposite coding agent when available. Give it the exact remote base/head SHAs, the repository policy, and explicit read-only instructions. If that bridge is unavailable, use a fresh independent read-only reviewer and report the fallback; never silently skip the broad pass.
2. Add at most two focused reviewers when the risk inventory justifies them, such as migrations, security, or release automation.
3. Validate concrete findings against the diff and classify each as `release blocker`, `deferred follow-up`, or `false alarm`.

Do not invoke an implementation workflow that may edit files. Do not fix findings or create follow-up artifacts. End with one decision: `PROCEED`, `HOLD`, or `ABORT`, with the evidence that controls it.

## 5. Create or Update the PR

Only continue when authorized and the decision is `PROCEED`.

- Reuse an existing open PR for the exact head/base pair; make creation idempotent.
- Use the documented title convention and explain themes, commit range, risk surfaces, gates, release semantics, and the deployment-verification boundary in the body.
- Update an existing PR only when the user authorized PR preparation and the current body is stale or materially incomplete.
- Monitor required GitHub checks read-only. A promotion PR wraps commits already reviewed on their original PRs, so do not create a Code Tour unless repository policy requires it or the user requests one.

If GitHub state changes, recompute the affected evidence rather than relying on the earlier snapshot.

## 6. Present the Merge Gate

Before waiting, inspect whether auto-merge is armed or the PR is already queued; if so, report the unowned pending mutation and return `HOLD`. If live rules require a merge queue, return `HOLD` and report that queue-only checks and changing base heads are unsupported in this version of the skill. Do not bypass the queue or change repository rules. Otherwise, poll until every required check and review has passed and GitHub reports the PR merge-ready, for at most 30 minutes with no polling interval or user-update interval longer than 60 seconds. If the bound expires, return `HOLD` with the latest gate evidence. Never arm auto-merge merely to wait for pending gates. Then, before any merge, present:

- PR URL and exact source/target head SHAs
- divergence state and mergeability
- required check/review state, the exact head or test-merge SHA those gates evaluated, and any test-merge parents
- documented merge method and proposed merge subject/body
- expected release behavior, including any legitimate no-release path
- production-impact surfaces and every external deployment target not verified here

Require the merge actor to be subject to non-bypass, server-enforced versions of every required check, review, and unresolved-thread gate; otherwise return `HOLD`. Then request a separate approval for merging that exact PR and the recorded release expectation. Include the relevant tag refs, GitHub Release baseline, and pending/running release-workflow state in the approval snapshot. Use structured user input when available; otherwise ask directly. Approval becomes stale if the PR head, base head, checks, reviews, mergeability, auto-merge/queue state, policy, release configuration, release baseline, or release-workflow state changes before the final refetch.

After approval, immediately refetch those fields. If any changed, treat the approval as stale, recompute and present the complete merge gate, and obtain fresh approval before proceeding. Pass the approved PR head SHA as a server-side precondition and merge only with the documented method. GitHub atomically binds only that head SHA: server enforcement protects required gates, while base and release-evidence changes remain refetch-and-verify races. Disclose those residual races in the merge gate, return `HOLD` when policy requires atomic binding that GitHub cannot provide, and otherwise verify after merging that the resulting target history is rooted at the final refetched base. Accept a changed release baseline only when Section 7 proves it was caused by this merge; treat any other change as incomplete verification. Auto-merge and merge queues are out of scope; a repository policy that merely permits auto-merge does not require this skill to use it. If auto-merge is already armed or the PR is queued, report the unowned pending mutation and stop rather than changing it or proceeding.

## 7. Verify the Release

Do not capture a merge SHA until GitHub reports the PR as `MERGED` after the head-bound direct merge request. If GitHub rejects the request or reports a different final state, refetch the PR and report that state instead of claiming a successful merge.

After merge:

1. Record the GitHub merge commit SHA.
2. Verify the promotion checks succeeded for the exact gate SHA recorded before merge: GitHub's test-merge commit with its verified base/head parents when that is what branch protection evaluated, otherwise the promoted head SHA.
3. Determine whether live workflow configuration predicts a release-workflow dispatch for this merge. When it does, poll for discovery and successful completion for at most 30 minutes with no polling or user-update interval longer than 60 seconds. Prove causality according to the configured trigger: match a `push` run's `head_sha` to the merge SHA; follow the triggering-run payload for `workflow_run`; or require an explicit merge-SHA/run-ID correlation for a manual or repository dispatch. Do not match merely by branch name, latest run, or a `workflow_run` job's default `GITHUB_SHA`. When configuration predicts no dispatch, record that expected absence explicitly. If the bound expires, dispatch behavior is uncertain, or an expected run is missing, release verification is incomplete.
4. Determine from policy and live release configuration whether this promotion should produce a version/tag/release. Evaluate the release tool's complete range since the recorded baseline, including previously unreleased commits, rather than only the source-vs-target diff.
5. When a release is expected, verify the GitHub Release points to the new tag and determine the expected tagged commit from policy and live release configuration. For tag-on-merge releases, require the dereferenced tag commit to equal the merge SHA. When the verified release workflow creates commits, require an auditable workflow output, log, artifact, or API result to identify the exact generated commit; then require the tag to identify that commit, require it to descend from the merge SHA, and verify that every intervening commit matches the configured release-generated changes. Treat commit metadata alone, missing provenance, or unrelated intervening commits as incomplete verification. Do not rely only on `targetCommitish`.
6. When releases are conditional, accept no new tag only if the full configured commit range predicts no release, the recorded tag/release baseline remains unchanged, and workflow behavior matches configuration (either a successful no-release run or an expected no-dispatch outcome). Report that outcome explicitly.

Report GitHub evidence separately from deployment status. Never claim Vercel, Railway, Kubernetes, a package registry, or another runtime is healthy unless a separately authorized workflow verified it directly.

## Terminal Report

Return one of:

- `NOTHING TO PROMOTE`
- `HOLD` or `ABORT`, with blockers and every mutation already performed, or confirmation that none occurred
- `PR READY — MERGE APPROVAL REQUIRED`, with the complete gate
- `MERGED AND RELEASE VERIFIED`, with PR, SHAs, checks, workflow, tag/release outcome, and unverified deployment surfaces
- `MERGED — NO RELEASE EXPECTED AND VERIFIED`, with the successful no-release evidence and unverified deployment surfaces
- `MERGED — RELEASE VERIFICATION INCOMPLETE`, with the exact missing or contradictory evidence

Always state which actions were performed and which were intentionally not performed.
