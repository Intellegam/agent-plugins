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

When the work goes beyond a tiny change and will become a PR, rate the plan
with the `merge-risk` skill before implementing; its profile goes into any plan
consultation.

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
scope; ask when the answer materially changes requirements, cost, or
authority. Preserve unrelated user work.

Keep changes within the requested outcome. Fix adjacent issues only when that
outcome depends on them; report independent improvements separately.
Assessment requests end with findings, not edits.

Write every line of prose (docs, guides, docstrings, comments) to pass the keep
test: true today, not derivable from the code in about a minute, costly to
lose, and stated once. Write comments and docstrings only where the code cannot
speak for itself: why, an external constraint, an unenforced invariant, a
workaround with its link, a cross-repository contract, or a hazard. No
narration, signature restatement, history, or ticket numbers. Update the owning
document instead of adding new prose elsewhere.

No new test is a valid outcome: add one only when a material contract
(authorization and trust-boundary validation, persistence and data loss, API
or protocol contracts, concurrency or cancellation, limits, errors that would
otherwise fail silently, and consequential logic (a wrong result that silently
reaches users, stored data, money, or another system); a fixed bug in one of these counts) could credibly break while
existing tests and the type checker stay green. Never remove the last test that
detects a material contract; a removal names the surviving test and assertion
that fails when the contract breaks. Remove or consolidate redundant tests in
files the change touches and report others; discard scratch and repro checks
that do not meet this bar. Replace a dependency only at an outside edge
(another process, the network, the clock), through one shared double per edge; never replace a module of the code
under test or add a test-only setter to production code. A failure that real
state cannot produce may be forced for one test only. Repository testing
standards and explicit user requests override this bar; existing test density
is not a standard.

Retain trust-boundary validation, data-loss protections, security, accessibility,
and explicitly requested behavior. For larger work, delegate bounded
implementation when useful and review it before accepting it. In Claude Code,
use `dev-workflow:dev-coder` for implementation delegation; in Codex, use a
worker with explicit file ownership and validation requirements.
Apply the shared sub-agent model policy to delegated work.

### 3. Validate

Run in order using `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex:

1. `dev-check` — formatting, lint, types, and tests
2. `dev-review` — risk-scaled independent review
3. `dev-sync` — prose hygiene and accuracy: docs, guides, docstrings, comments

### 4. Commit and Push

Follow repository commit conventions. Force-push only feature branches, with
`--force-with-lease`, never the default or protected branches. Never infer
permission for external communication, production deployments (any deploy or
merge that reaches a production environment), or destructive operations from an
implementation request.

You write the PR title and body. Open each body, except branch promotions,
with the PR card as the `merge-risk` skill describes, and show its chat card in
your reply. When the work comes from a Linear issue, put its key in the branch
name or the PR title so Linear links the PR; when neither can carry it, add a
`Refs <key>` line below the card.

Merge only as the user's own instructions allow. For branch promotions, the `promote`
skill’s authorization contract applies, including any user or repository
requirement for a separate per-PR checkpoint that has not been explicitly
waived.

### 5. Code Tour

Phases 5 and 6 skip branch promotions: the `promote` skill carries them to the end, including any code tour.

After opening a PR and before babysitting it, handle the reviewer walkthrough as a separate workflow phase:

- If repository guidance requires a code tour or the user requested one, run `/code-tour:code-tour` in Claude Code or `$code-tour:code-tour` in Codex. If the skill is unavailable, report that instead of silently skipping the requirement.
- Creating the local tour does not authorize publishing it or posting to the PR. Follow the code-tour skill's separate authorization boundary for external actions.

Do not install code-tour automatically. It remains an optional companion plugin that owns tour generation and delivery.

### 6. Babysit

After opening a PR, run `/dev-workflow:babysit-pr` in Claude Code or `$dev-workflow:babysit-pr` in Codex to triage feedback and CI until the PR closes or needs a user decision.
</dev-workflow>
