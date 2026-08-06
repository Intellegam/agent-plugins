---
name: dev-check
description: This skill MUST be used before committing changes and after completing implementation work. Proactively run this (1) before any git commit, (2) after a plan has been fully implemented, (3) when a coding task is complete. Also use when user asks to "run checks", "format and lint", "run tests", "validate code", or names the repo's check tools directly (e.g. "run ruff", "run biome", "run the type check").
---

# Pre-Commit Checks

## Dev Workflow

This skill is part of `dev-check` → `dev-review` → `dev-sync`. Invoke workflow skills through `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex.

| Phase     | Purpose                          |
| --------- | -------------------------------- |
| **check** | Format, lint, types, tests       |
| review    | Code quality, tests, correctness |
| sync      | Documentation alignment          |

Skills can be chained in one prompt or invoked sequentially through the host's skill selector.

---

Run checks, **auto-fix what you can**, only ask when genuinely unsure.

**Loop until all checks pass.** Fix issues and re-run until clean.

## The Contract

Read every applicable `AGENTS.md` and `CLAUDE.md` by directory scope. The repository declares Required Checks and Situational Checks in one of those guidance files. If both exist, follow both and let the nearer-scoped file win on conflicts. If the sections are missing, invoke `dev-workflow:setup` or ask the user before proceeding; do not guess commands.

## Scale to the Change

Pick a tier before running anything, and state which one you picked:

| Tier          | Typical change                                              | Check scope                                                          |
| ------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| **tiny**      | Typo, doc-only, comment, config one-liner                   | Format/lint on changed files; typecheck/tests only if plausibly affected |
| **normal**    | Default for code changes                                    | All Required Checks (whole repository) + Situational Checks whose conditions clearly match |
| **high-risk** | Auth, data migrations, public APIs, large multi-file change | Same as normal, but lean toward running Situational Checks when in doubt |

When in doubt, go one tier up.

## Required Checks

Run the commands under **Required Checks**, fix failures automatically (report what a tool couldn't auto-fix). For normal and high-risk tiers, check the entire repository — avoid targeting only specific files or directories.

## Situational Checks

Run the **Situational Checks** whose conditions match the change (at high-risk, run them when in doubt; at tiny, skip). Beyond the declared checks, think about what additional validation makes sense for what changed — e.g. exercising a changed CLI command, hitting a changed endpoint, or running a relevant validation skill.

**Tip**: Check available skills — some are useful for testing and validation.

Use judgment. Skip if tests already cover it, add others if the situation calls for it.

## Drift Guard

The declared checks are the baseline, not a cage. Each run, glance at the repository's CI surfaces (workflow files and manifest tasks). If CI gates a check that repository guidance does not list:

- **Run it** when it's clearly a safe local command (a lint/typecheck/test-style script)
- **Flag it** when it's ambiguous, secrets-dependent, or CI-only

Either way, report the declared checks as **stale** — visibly, before any commit/PR — and recommend updating the section (via `dev-workflow:dev-sync` or `dev-workflow:setup`). This is also open-ended in the other direction: think about what validation the change itself calls for, listed or not.

## Output

Summarize results, report what was fixed, confirm all checks pass. Include any drift findings.

## Next Step

When all checks pass, continue to `dev-review` unless the user asked for checks only. State the transition and proceed. Ask only when an unfixable failure has multiple reasonable resolutions.
