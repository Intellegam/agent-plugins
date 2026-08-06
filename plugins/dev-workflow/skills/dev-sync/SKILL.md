---
name: dev-sync
description: This skill MUST be used after dev-review and before pushing or creating a PR. Proactively run it after review completes. Also use when the user asks to sync docs, check documentation, update AGENTS.md or CLAUDE.md, or ensure agent components are current.
---

# Sync Check

Ensure documentation and agent components match the completed change and that new content lives in the right document. Fix clear drift and ask only for non-obvious decisions.

This skill follows `dev-check` → `dev-review` and precedes commit/push/PR. Invoke workflow skills through `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex.

## Repository Guidance

Read every applicable `AGENTS.md` and `CLAUDE.md` by directory scope. If both exist, follow both; the nearer-scoped file wins when they conflict. Use the Review Inputs and custom workflow configuration from whichever file defines them.

## Scale to Risk

- **Tiny**: read and apply the canonical sync contract directly as a quick self-check when the change has no behavior/interface impact.
- **Normal/high-risk**: delegate one read-only sync review over the complete target.

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

Committing, pushing, and opening a PR require an explicit user decision. Use the host's user-input mechanism when available; otherwise ask directly. Offer:

- **Just commit**
- **Commit + push**
- **Commit + PR**
- **Stop without committing**

For a PR, draft the title/body and obtain confirmation before creation. After creation, continue to `babysit-pr`. Follow repository branch/commit conventions and never merge or land the PR without the user's separate approval.
