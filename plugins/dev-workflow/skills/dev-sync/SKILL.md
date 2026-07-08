---
name: dev-sync
description: This skill MUST be used after dev-review, before pushing or creating a PR. Proactively run this after dev-review completes. Also use when user asks to "sync docs", "check documentation", "update CLAUDE.md", or "ensure docs are current".
---

# Sync Check

## Dev Workflow

This skill is part of the dev workflow: `dev-check` → `dev-review` → `dev-sync` (invoke via the Skill tool as `dev-workflow:dev-check`, `dev-workflow:dev-review`, `dev-workflow:dev-sync`).

| Phase    | Purpose                          |
| -------- | -------------------------------- |
| check    | Format, lint, types, tests       |
| review   | Code quality, tests, correctness |
| **sync** | Documentation alignment          |

Skills can be chained in a single prompt or invoked sequentially via the Skill tool.

---

Ensure documentation and Claude components are in sync with code changes and that added content lives in the right doc. **Fix what you can**, ask for non-obvious decisions.

**Scale to the change**: if the workflow run picked the **tiny** tier (no behavior or interface impact), a quick self-check is enough — skip the reviewer agent and say so. Run the full process for normal and high-risk changes.

## Process

For normal and high-risk runs, use the Agent tool to launch the `dev-workflow:dev-sync-reviewer` agent to analyze what's out of sync or misplaced. For tiny runs, do the quick self-check yourself instead.

## What to Check

Based on what changed, check if related documentation needs updates:

| Changed              | Check                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| Module code          | Do module-level docs/CLAUDE.md files still point to correct docs?                    |
| Public APIs          | Are docstrings/API docs present and accurate?                                        |
| Component behavior   | Does the repo's documentation reflect current code?                                  |
| Claude skills/agents | Do `.claude/skills/` and `.claude/agents/` still accurately describe behavior?       |
| Commands & checks    | Do the declared commands, docs paths, and reviewers still exist? Does CI gate checks CLAUDE.md doesn't list (or did `dev-check` flag drift)? Update the sections accordingly — dev-sync owns their repair |
| Placement            | Does each added paragraph serve THIS doc's target reader and the task this doc owns? |

**Guidelines**: Apply the repo's documentation standards if declared under Review Inputs in CLAUDE.md.

**When making updates**: Integrate new content into existing structure—don't bolt it on. Add to existing lists, match the surrounding style, avoid "**Important**:" patch markers. Updates should feel like they've always been there.

**Before adding content to a doc**, ask whether the doc's specific reader needs that content here to complete the task this doc owns. Keep cross-cutting explanations, authoring walkthroughs, and deep conceptual material in one canonical location; other docs should summarize briefly and link there. Migration-shaped updates often create accurate but misplaced content — especially when implementation context, PR history, or full examples are added to operational docs.

Use judgment. Not every code change needs doc updates. Focus on:

- New modules/components without documentation
- Changed behavior not reflected in docs
- Outdated examples or instructions
- Content added to a doc whose reader does not need it (placement)

## Next Step

**Before offering to commit**: if review or sync edited any files since the last `dev-check` pass, re-run the Required Checks — plus any Situational Checks whose conditions the new edits match — before continuing. Post-check edits must not reach a commit unchecked.

Committing, pushing, or opening a PR is a genuine decision — when everything is in sync, use AskUserQuestion:

| Option            | Action                                                                        |
| ----------------- | ------------------------------------------------------------------------------ |
| **Just commit**   | Commit changes, stop                                                          |
| **Commit + Push** | Commit changes, push to remote                                                |
| **Commit + PR**   | Commit changes, create pull request                                           |
| **Stop**          | Stop without committing                                                       |

For PR creation, draft the title and description, then ask user to confirm or adjust. If the repo has a PR-triage workflow (e.g. a `pr-triage` skill watching CI and review comments), chain into it after creating the PR.

Follow the repo's branching and commit conventions (Conventional Commits unless the repo says otherwise). If you're on the repo's production branch, confirm intention with the user before committing.

---

**Workflow complete.** Full flow: `dev-check` → `dev-review` → `dev-sync` → commit/push/PR.
