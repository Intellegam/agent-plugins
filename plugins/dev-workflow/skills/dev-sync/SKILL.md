---
name: dev-sync
description: Keep the prose a change touches lean and accurate — documentation, AGENTS.md/CLAUDE.md, skills, docstrings, and code comments — after review and before publication. Also use for requests to sync or trim documentation, update AGENTS.md or CLAUDE.md, clean up comments, or check for documentation drift.
---

# Prose Hygiene and Sync

Review every prose surface the change touches — documentation, folder guides, skills and agent definitions, docstrings, and code comments. Delete what fails the keep test in the canonical contract, condense or move what lives in the wrong place, and fix what the change made false. Prose should shrink or stay flat unless the change needs more; apply clear findings and ask only for non-obvious decisions.

This skill follows `dev-check` → `dev-review` and precedes commit/push/PR. Invoke workflow skills through `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex.

## Repository Guidance

Follow the applicable repository and touched-directory instructions; read any missing from context and avoid rereading aliases of the same file. If both exist, follow both; the nearer-scoped file wins when they conflict. Use the Review Inputs and custom workflow configuration from whichever file defines them.

## Scale to Risk

- **Tiny**: apply the canonical contract directly as a self-check.
- **Normal/high-risk**: delegate one read-only review over the complete target, including its comments and docstrings.

Read and apply the shared sub-agent model policy at
`../../references/sub-agent-model-policy.md` when delegating a sync review.

## Canonical Sync Contract

The non-invokable reviewer contract is `references/sync-reviewer.md` adjacent to this skill. Resolve its absolute path and require the reviewer to read it completely. Fail closed: if it cannot load the reference, it must stop and report the path/error rather than perform a generic review.

### Claude Code adapter

Launch the thin `dev-sync-reviewer` agent with the goal, complete target, and Review Inputs. Its wrapper loads the canonical reference through `${CLAUDE_PLUGIN_ROOT}`.

### Codex adapter

Use `spawn_agent` with a read-only/no-delegation task. Pass the resolved absolute sync-reference path, goal, exact target, changed and untracked paths, and Review Inputs. Let it inspect the shared checkout directly.

If delegation is unavailable, perform the same contract directly and state the fallback.

## Recheck After Edits

If review or sync changes any file after the last `dev-check`, rerun all Required Checks plus newly matching Situational Checks. Do not commit post-check edits without validation.

## Commit/Push/PR Decision

Honor existing explicit authorization for commits, feature-branch pushes, and
PR creation. An explicit request for a PR includes preparing its title/body and
creating it after validation; do not ask for the same approval again. If scope
is unclear, prepare the reviewable local result and ask only for the missing
decision (commit, push, or PR).

Ask before force-pushing. Never merge or land a PR without the user’s separate
approval for that exact PR. After creation, handle the top-level Code Tour phase
and continue to `babysit-pr`; tour publication has its own authorization boundary.
