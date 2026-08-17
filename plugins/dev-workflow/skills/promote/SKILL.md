---
name: promote
description: Prepare, open, merge, and verify GitHub release-promotion PRs using repository-owned promotion policy. Use when the user asks to promote staging or dev to production or main, merge a release branch, deploy or ship to production through GitHub, cut a release, create a promotion PR, or assess promotion readiness.
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

Resolve paths from the repository root. Read guidance and policy from the exact remote source SHA being promoted, not whichever files happen to be in the working tree. Resolve repository-internal guidance symlinks within that same remote tree; reject missing targets, cycles, and targets that escape the repository. When the pointer includes an anchor, require a matching heading in the referenced document. Also compare the target SHA's policy when it exists, and inspect release configuration at both SHAs; the source version describes the tree that will run after merge. If this promotion changes its policy pointer, policy document, or release configuration, make that an explicit risk surface and stop on any unresolved contradiction. A load-bearing contract covers:

- source and target branch roles
- promotion PR title convention
- required promotion gates and the intended merge method
- release triggering and conditional no-release cases
- what GitHub evidence proves, and which deployment surfaces remain outside verification

Also inspect the live mechanisms that can confirm or contradict the contract: release workflows, version/release configuration, package manifests, and GitHub branch/PR state. Keep intentional policy in the normal documentation; do not copy it into agent guidance.

For a read-only readiness assessment, an explicit policy supplied by the user in the current session may substitute for a missing pointer. Echo the temporary assumptions in the report. Creating/updating a PR or merging requires the committed pointer and its target to exist. If the contract is missing or insufficient, stop and offer `dev-workflow:setup`; do not discover and guess a release policy from scattered files.

## 2. Establish Authorization

Map the request to the narrowest authorized stage:

- **Assess/readiness/review**: run through the release decision only.
- **Create or update the promotion PR**: assess, then create or update that PR. Do not merge.
- **Promote/ship/release**: assess and prepare the PR, then stop at the separate merge gate.
- **Merge this exact ready PR**: still revalidate and present the gate before asking for approval unless the user approved that exact merge after seeing an equivalent current gate.

If the requested action is ambiguous, default to assessment. External deployment, rollback, branch reconciliation, and repository-setting changes require their own explicit authorization and are outside this skill.

## 3. Remote-Only Preflight

Use authenticated GitHub tooling and remote refs. Do not switch the working tree.

1. Resolve the GitHub repository and fetch/prune its remote refs.
2. Record source and target remote head SHAs, their merge base, and commits unique to each side.
3. Inspect the complete source-vs-target three-dot diff, diff stat, and no-merges commit history.
4. Inspect open and closed promotion PRs for the same head/base before considering creation.
5. Record the current release baseline: the latest tag/release relevant to this product, its dereferenced commit SHA, and the release tool's complete configured commit range. Include commits left unreleased by earlier no-release or failed runs; the current promotion diff alone is not enough to predict the next release.
6. Compare branch topology with the documented policy.

If the source has no unique changes, report that there is nothing to promote. Do not treat a nonzero target-unique count as an automatic blocker: merge-commit promotions normally leave prior promotion merge commits unique to the target. Classify those commits as expected only when policy/history identify them as prior promotions and their introduced file changes are already represented in the source. If the target has other unique content, histories are unrelated, or either head changes during assessment, stop and report the divergence. Never resolve it inside this workflow.

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

Wait until every required check and review has passed and GitHub reports the PR merge-ready. Never arm auto-merge merely to wait for pending gates. Then, before any merge, present:

- PR URL and exact source/target head SHAs
- divergence state and mergeability
- required check/review state and unresolved release blockers
- documented merge method and proposed merge subject/body
- expected release behavior, including any legitimate no-release path
- production-impact surfaces and every external deployment target not verified here

Then request a separate approval for merging that exact PR. Use structured user input when available; otherwise ask directly. Approval becomes stale if the PR head, base head, checks, reviews, mergeability, policy, or release configuration changes.

After approval, immediately refetch those fields. Merge only with the documented method. Use auto-merge only when policy permits it, every gate remains green, and GitHub currently supports it; if unavailable, stop rather than changing repository settings.

## 7. Verify the Release

Do not capture a merge SHA until GitHub reports the PR as `MERGED`. If auto-merge is armed, monitor the PR with bounded waits and periodic user updates. Stop if it closes without merging, auto-merge is removed, checks fail, or approval becomes stale.

After merge:

1. Record the GitHub merge commit SHA.
2. Verify the promotion checks completed for the promoted head.
3. Match the release workflow run to the merge SHA, not merely the branch name or latest run.
4. Determine from policy and live release configuration whether this promotion should produce a version/tag/release. Evaluate the release tool's complete range since the recorded baseline, including previously unreleased commits, rather than only the source-vs-target diff.
5. When a release is expected, verify the GitHub Release points to the new tag and the dereferenced tag commit resolves to the merge SHA. Do not rely only on `targetCommitish`.
6. When releases are conditional, accept a successful workflow with no new tag only if the full configured commit range predicts no release and the recorded tag/release baseline remains unchanged. Report that outcome explicitly.

Report GitHub evidence separately from deployment status. Never claim Vercel, Railway, Kubernetes, a package registry, or another runtime is healthy unless a separately authorized workflow verified it directly.

## Terminal Report

Return one of:

- `NOTHING TO PROMOTE`
- `HOLD` or `ABORT`, with blockers and unchanged repository state
- `PR READY — MERGE APPROVAL REQUIRED`, with the complete gate
- `MERGED AND RELEASE VERIFIED`, with PR, SHAs, checks, workflow, tag/release outcome, and unverified deployment surfaces
- `MERGED — RELEASE VERIFICATION INCOMPLETE`, with the exact missing or contradictory evidence

Always state which actions were performed and which were intentionally not performed.
