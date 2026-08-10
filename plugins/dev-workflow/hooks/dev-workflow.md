<dev-workflow>
The dev-workflow plugin is active. Apply the phases that fit the coding task's scope, whether acting as the main agent or an implementation owner. Skip commit/PR phases when a parent agent owns them.

Read every applicable `AGENTS.md` and `CLAUDE.md` by directory scope. Repository-specific commands, checks, Review Inputs, and Dev Workflow Plugin sections win over generic workflow defaults. If both guidance variants exist, follow both; let the nearer-scoped file win on conflicts.

### 1. Explore and Plan

For non-trivial tasks:

- Use the host's exploration sub-agent when useful; otherwise search directly for relevant code, existing utilities, tests, and documentation.
- Use official documentation or a focused research agent for unfamiliar external APIs.
- Ask whether a small refactor makes the change simpler before adding new behavior.
- Plan the smallest complete solution and challenge every new abstraction or file.
- Get an independent perspective from the other coding agent:
  - In Claude Code, read `collaborating-with-codex` and use the Codex MCP tools.
  - In Codex, read `collaborating-with-claude` and use the Claude-agent MCP tools.
  - If the opposite-host tools are unavailable, state the fallback and use a fresh independent read-only reviewer rather than implying the external agent participated.
- Stress-test non-trivial plans with that independent perspective before presenting them.

### 2. Implement

Follow repository standards and Review Inputs.

Before adding code, climb this ladder and stop at the first rung that holds:

1. Does this need to exist at all?
2. Does the codebase already provide it?
3. Does the standard library or native platform cover it?
4. Does an installed dependency cover it?
5. Only then add the minimum new implementation.

Never trim trust-boundary validation, data-loss-preventing error handling, security, accessibility, tests for non-trivial behavior, or explicitly requested behavior.

For larger implementations, consider delegation to preserve orchestration context:

- Claude Code: use `dev-workflow:dev-coder`.
- Codex: use an implementation-focused worker sub-agent with explicit file ownership and validation requirements.

Review delegated output before accepting it.

### 3. Validate

Run in order using `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex:

1. `dev-check` — formatting, lint, types, and tests
2. `dev-review` — risk-scaled independent review
3. `dev-sync` — documentation and agent-surface alignment

### 4. Commit and Push

Follow repository commit conventions. Committing, pushing, and opening a PR require the user's explicit choice; merging or landing requires a separate explicit approval.

### 5. Code Tour

After opening a PR and before babysitting it, handle the reviewer walkthrough as a separate workflow phase:

- If repository guidance requires a code tour or the user requested one, run `/code-tour:code-tour` in Claude Code or `$code-tour:code-tour` in Codex. If the skill is unavailable, report that instead of silently skipping the requirement.
- Otherwise, when the code-tour skill is available, offer it for normal and high-risk changes; skip the offer for tiny changes.
- Creating the local tour does not authorize publishing it or posting to the PR. Follow the code-tour skill's separate authorization boundary for external actions.
- A tour describes one exact PR head. When one is created, retain that head SHA in task context and preserve it across compaction or handoff. During babysitting, compare it with the current PR head regardless of who pushed; do not rebuild after every push, and offer one refresh when the updated PR first reaches a clean milestone.

Do not install code-tour automatically. It remains an optional companion plugin that owns tour generation and delivery.

### 6. Babysit

After opening a PR, run `/dev-workflow:babysit-pr` in Claude Code or `$dev-workflow:babysit-pr` in Codex to triage feedback and CI until the PR closes or needs a user decision.

If repository guidance has no commands/checks contract, offer `dev-workflow:setup`.
</dev-workflow>
