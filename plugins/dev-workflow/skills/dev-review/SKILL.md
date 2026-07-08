---
name: dev-review
description: This skill MUST be used before pushing or creating a PR. Proactively run this before any git push or PR creation. Also use when user asks to "review code", "code review", "check code quality", or "find bugs".
---

# Code Review

## Dev Workflow

This skill is part of the dev workflow: `dev-check` → `dev-review` → `dev-sync` (invoke via the Skill tool as `dev-workflow:dev-check`, `dev-workflow:dev-review`, `dev-workflow:dev-sync`).

| Phase      | Purpose                          |
| ---------- | -------------------------------- |
| check      | Format, lint, types, tests       |
| **review** | Code quality, tests, correctness |
| sync       | Documentation alignment          |

Skills can be chained in a single prompt or invoked sequentially via the Skill tool.

---

Run comprehensive code review, **fix obvious issues directly**, only ask for non-obvious trade-offs.

Read the repo's CLAUDE.md first: the commands & checks section declares Review Inputs (standards docs to give reviewers), and the Dev Workflow Plugin section may declare custom dev-workflow reviewers (repo-specific reviewer agents to spawn).

## Why This Review Matters

LLM-assisted coding produces subtle issues that differ from human mistakes - not syntax errors, but conceptual issues like over-engineering, unnecessary abstractions, and unintended side effects. These reviewers specifically target patterns that "work" but aren't what a thoughtful senior engineer would write.

## Scale to the Change

| Tier          | Reviewers                                                       | Passes                          |
| ------------- | --------------------------------------------------------------- | ------------------------------- |
| **tiny**      | Self-review the diff carefully; no sub-agents                   | 1                               |
| **normal**    | Full reviewer set incl. the repo's custom reviewers           | Max 2 (see bounded loop below)  |
| **high-risk** | Same as normal                                                  | Max 3                           |

If `dev-check` already picked a tier, reuse it.

## Process

### 1. Prepare Context for Reviewers

Before spawning reviewers, prepare minimal context. Include:

- **Goal**: One sentence - what problem is being solved
- **Constraints**: Hard requirements (if any)
- **Scope**: Files changed, **including the actual diff** — reviewers run with fresh context and no Bash, so paste the `git diff` output into their prompt; for very large diffs, include the per-file stat plus the hunks for the riskiest files and name the rest for reading
- **Review Inputs**: the standards docs declared in CLAUDE.md

**Do NOT include**: Why specific solutions were chosen, alternatives considered, or reasoning. Reviewers should form independent opinions, not validate decisions.

### 2. Spawn Reviewers

All reviewers run conceptually in parallel. Execute in this order for efficiency:

First, spawn sub-agents in parallel:

1. `dev-workflow:dev-quality-reviewer` - code quality, simplicity, maintainability
2. `dev-workflow:dev-test-reviewer` - test coverage and quality
3. Any **custom dev-workflow reviewers** declared in CLAUDE.md's Dev Workflow Plugin section (repo-local agents, e.g. a fork-maintenance or framework-conventions reviewer)
4. `Explore` agent if available (otherwise search directly) - find existing utils, patterns, types that new code might duplicate
5. Situational, for unfamiliar external APIs: a web-research agent if available, otherwise check the docs yourself via WebFetch/WebSearch

Then, run correctness review:

6. `codex-review` MCP tool - external correctness perspective. If unavailable, notify user and use the `dev-workflow:dev-correctness-reviewer` agent as fallback.

### 3. Collect & Classify

Gather findings from all reviewers. **Verify Before Fixing**: reviewer findings are hypotheses, not facts. For any claim about behavior ("X breaks on input Y", "this can leak Z"), prove or disprove empirically (grep, reproducing snippet, targeted test) before acting. Past false alarms acted on blindly cost more than the few seconds of verification.

Classify each finding:

| Class                   | Meaning                                         | Action                                               |
| ----------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| **already-addressed**   | Prior commit / test already covers it           | Note and skip                                        |
| **false-alarm**         | Claim doesn't match verified behavior           | Optional: add a regression test to lock the behavior |
| **real-fix-obvious**    | Clear bug, small self-contained fix             | Fix directly (naming, DRY, bug fix)                  |
| **real-fix-nonobvious** | Real issue but fix is ambiguous or far-reaching | Present options to user                              |
| **judgment-call**       | Stylistic or subjective trade-off               | Present options to user                              |

### 4. Root-Cause Reflection

Before fixing anything — and again before any further pass — step back and look at the findings **as a set**, not one by one:

- Do several findings cluster around the same file, abstraction, or data flow?
- Are you about to fix the same area for the second time?
- Would the fixes be the Nth patch on the same underlying behavior?

If yes, **stop patching**. Name the suspected root cause, evaluate a structural fix, and prefer it over accumulating local fixes. If the structural fix is far-reaching, present it to the user with the symptom pattern as evidence. Patch-stacking is a known failure mode: a pile of individually-reasonable fixes that leaves a deeper flaw in place.

### 5. Bounded Re-Review

LLMs are non-deterministic — a second pass can catch what the first missed. But review loops have sharply diminishing returns, so bound them:

1. After fixing issues, re-run **all** review agents once (not the Explore/web-research helpers, unless the fixes entered unfamiliar territory), scoped to ALL changes (original + fixes), not just the increments
2. Stop after that second pass unless it surfaced **new P1/P0 findings** or the change is **high-risk** (then one more pass, max)
3. A pass that yields only P3/stylistic findings ends the loop — report those as optional improvements instead of fixing-and-relooping

### 6. Summary

Report:

- What was fixed
- What needs user decision (with options)
- Any root-cause concern raised in step 4
- Confirmation that review passed

## Next Step

Continue to `dev-workflow:dev-sync` (the recommended next step) unless the user asked for review only. Don't stop to ask — state what you're doing and proceed. Only ask when a genuine decision exists (e.g. unresolved `real-fix-nonobvious` or `judgment-call` findings).

## Continuous Learning

If the user provides feedback about issues the review missed, offer to add them to the repo's code standards doc (the one declared under Review Inputs in CLAUDE.md). This improves both future reviews and code generation.

## Notes

- Codex review is valuable - always try it first
- Sub-agents consult the Review Inputs declared in `CLAUDE.md`
- Focus on current changes, but read context as needed
