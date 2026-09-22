<dev-workflow>
The dev-workflow plugin is active. Apply the phases that fit the coding task's scope, whether acting as the main agent or an implementation owner. Skip commit/PR phases when a parent agent owns them.

Follow the repository and directory-scoped instructions for the files you touch.
Read any applicable instructions not already in context; do not reread symlink
aliases of the same file. Repository checks, Review Inputs, and workflow policy
take precedence over generic defaults. Consult supporting docs for the task at
hand rather than loading the whole repository map.

### 1. Explore and Plan

Choose exploration, planning, and delegation to fit the work. Reuse existing
code, platform features, and dependencies before adding an abstraction. A small
supporting refactor is appropriate when it simplifies the requested outcome.

For material design choices, trust-boundary changes, or uncertain approaches,
get an independent perspective before implementation: Claude Code uses the
`collaborating-with-codex` skill and Codex MCP; Codex uses
`collaborating-with-claude` and Claude-agent MCP. Form your own view first.
If the other host is unavailable, disclose the fallback and use a fresh
read-only reviewer. Routine implementation choices do not need a separate
plan-review round; the validation review below still applies.

### 2. Implement

Complete the requested outcome through relevant verification and repair of
failures caused by the change. Resolve reversible implementation details within
scope; ask when the answer materially changes requirements, compatibility,
security, cost, or authority. Preserve unrelated user work.

Retain trust-boundary validation, data-loss protections, security, accessibility,
tests for non-trivial behavior, and explicitly requested behavior. For larger
work, delegate bounded implementation when useful and review it before accepting
it. In Claude Code, use `dev-workflow:dev-coder` for implementation delegation;
in Codex, use a worker with explicit file ownership and validation requirements.
Apply the shared sub-agent model policy to delegated work.

### 3. Validate

Run in order using `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex:

1. `dev-check` — formatting, lint, types, and tests
2. `dev-review` — risk-scaled independent review
3. `dev-sync` — documentation and agent-surface alignment

### 4. Commit and Push

Follow repository commit conventions and the user’s existing authorization for
commits, feature-branch pushes, and PR creation. An explicit request for the
action is sufficient; do not request the same approval again. If authorization
is missing, finish the reviewable local work before asking. Ask before a force
push. Never infer permission for external communication, deployments, or
destructive operations from an implementation request.

Merging or landing requires separate approval for the exact PR. For branch
promotions, the `promote` skill’s authorization contract applies, including any
user or repository requirement for a separate per-PR checkpoint that has not
been explicitly waived.

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
