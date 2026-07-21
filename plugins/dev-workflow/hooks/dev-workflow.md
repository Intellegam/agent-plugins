<dev-workflow>
The dev-workflow plugin is active. For coding tasks, follow this workflow — whether you are the main agent or a sub-agent delegated a coding task. Apply the phases that fit your task's scope (e.g. skip commit/PR phases when your spawning agent owns them). Repo-specific commands and policy come from CLAUDE.md (commands & checks, Dev Workflow Plugin sections) — where those are concrete, they win.

This workflow ensures code quality through multiple perspectives: Codex for early collaboration & validation, automated checks, and parallel reviewers that catch different types of issues. Following this process consistently catches problems before they reach production.

### 1. Explore & Plan

For non-trivial tasks, enter plan mode. Then:

- **Explore**: Use `Explore` agents to find things like
  - Relevant code and patterns
  - Existing utils/functionality to reuse (avoid duplication)
  - Related documentation and tests
- **Web-Research**: Use web-research agents (e.g. `web-explore`) to find external documentation, best practices, or unfamiliar APIs
- **Refactor first**: Ask whether a small refactor would make the change much simpler than bolting it onto the current shape — "make the change easy, then make the easy change". If yes, the plan leads with the refactor.
- **Lean plan**: Plan the leanest version that solves the problem. Challenge whether each part needs to exist and whether the diff could be smaller.
- **Brainstorm**: Use `codex` MCP to get an independent perspective on the problem, then iterate via `codex-reply` until you converge on a common strategy
- **Plan review**: Before presenting a plan (to the user, or to your spawning agent), validate the approach with `codex` — including the refactor-first and lean-plan questions above. Never present a plan without Codex validation — the recipient should receive a plan that has been stress-tested by a second perspective.

Read the `collaborating-with-codex` skill for Codex guidelines.

### 2. Implement

Write code following the repo's code standards and testing guidelines (declared under Review Inputs in CLAUDE.md).

**Minimality**: before writing new code, climb this ladder and stop at the first rung that holds:

1. Does this need to exist at all? (YAGNI) — speculative need means skip it and say so
2. Already in this codebase? Reuse it — look before you write
3. Stdlib or a native platform feature covers it? Use that
4. An already-installed dependency covers it? Use it — never add a new one for what a few lines can do
5. Only then: the minimum code that works — no speculative abstractions, no scaffolding "for later"

Never trim: validation at trust boundaries, error handling that prevents data loss, security, accessibility, or explicitly requested behavior. And never be lazy about understanding the problem — the ladder shortens the solution, not the reading.

**Context preservation**: For larger implementations, consider delegating to `dev-workflow:dev-coder` agents to preserve your context for orchestration and review.

| Scope                          | Consider                                               |
| ------------------------------ | ------------------------------------------------------ |
| Small (few lines, single file) | Implement directly                                     |
| Medium/Large (multi-file)      | Consider delegating to `dev-workflow:dev-coder` agents |

When delegating: provide clear requirements, review the output, iterate if needed.

### 3. Validate

Run these skills in order:

1. `/dev-workflow:dev-check` - Format, lint, types, tests
2. `/dev-workflow:dev-review` - Over-engineering, code quality, test coverage, correctness
3. `/dev-workflow:dev-sync` - Documentation alignment

### 4. Commit & Push

Follow Conventional Commits. Offer push/PR options.

### 5. Babysit (after PR is opened)

Run `/dev-workflow:babysit-pr` to triage review comments and CI failures — event-driven, loops until the PR is clean or waiting on user decision.

If the repo has no commands & checks section in CLAUDE.md, offer `/dev-workflow:setup`.
</dev-workflow>
