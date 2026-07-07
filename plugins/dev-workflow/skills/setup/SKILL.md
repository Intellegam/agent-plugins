---
name: setup
description: Set up, validate, or migrate a repository's Dev Workflow Contract. Use when onboarding a repo to the org dev workflow, when the contract in CLAUDE.md is missing or outdated for the installed plugin version, or when the user asks to "set up the dev workflow", "onboard this repo", "check the workflow config", or wants recommendations for workflow improvements (reviewers, checks, skills).
---

# Dev Workflow Setup

Act as a workflow consultant for this repository: inspect it, recommend how it should plug into the org dev workflow, and apply only what the user accepts.

Three phases, always in order: **Inspect → Recommend → Apply**.

**Dry run**: if the user asked for recommendations only, stop after Recommend and present anything that would have been an AskUserQuestion as an open question with your recommended default.

## Phase 1: Inspect

Gather evidence before recommending anything. Look at:

- **Stack & tooling**: manifest files (`pyproject.toml`, `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, ...), lockfiles, and the scripts/tasks they define (format, lint, typecheck, test)
- **CI config** (`.github/workflows/`, etc.): which checks actually gate merges — these are the ground truth for required checks
- **Existing Claude assets**: `CLAUDE.md` (does a contract block exist? which version?), `.claude/skills/`, `.claude/agents/`, `.claude/settings.json` hooks
- **Docs**: code standards, testing guidelines, architecture docs — candidates for Review Inputs
- **Repo shape signals**: upstream remotes or fork markers, `custom/` directories, monorepo/workspace layout, generated code, infra-as-code — anything that suggests repo-specific reviewers or situational checks
- **Git history**: recently deleted or moved workflow assets (`git status`, `git log` on `.claude/`, CLAUDE.md) — repos migrating from a local workflow to this plugin often carry the strongest evidence in just-removed files

Use Explore agents for broad scans if available (otherwise search directly); read key files directly. Every later recommendation must cite evidence found here (a file path or observed pattern). If you can't cite evidence, don't recommend it.

Also check symlinks in **both** directions between `CLAUDE.md` and `AGENTS.md` (e.g. `CLAUDE.md → AGENTS.md`, or `AGENTS.md → CLAUDE.md`): the contract write lands in the physical target and fans out to every consumer of the linked file (e.g. Codex reads AGENTS.md) — surface this before applying.

## Phase 2: Recommend

Present findings in three groups:

- **Required** — the repo can't run the workflow without these: the contract block itself, and any check command that couldn't be detected. Phrase undetectable commands as explicit questions with your recommended default (in a dry run, list them as open questions in the report)
- **Recommended** — clear evidence supports these: e.g. "upstream remote + `custom/` dir → add a fork-maintenance reviewer agent", "CI runs an e2e suite → add it as a situational check", "docs/guides/code-standards.md exists → register as review input"
- **Optional** — useful but judgment-call: extra skills, hook cleanups, CLAUDE.md improvements

For each item: what, why (with evidence citation), and what applying it would change. Propose — never adopt silently. Anything touching branch/release policy, security, or hooks is always proposed, never auto-applied.

If the repo already encodes checks elsewhere (a local `dev-check`-style skill, a prose workflow section in CLAUDE.md), the contract becomes the single source of truth: recommend updating those assets to point at the contract or removing the duplication. De-duplication edits outside the markers are allowed in Apply — but only for items the user explicitly accepted; never silently.

Do **not** recommend reviewers or checks the plugin already provides: the workflow ships quality, test, and correctness reviewers (spawned by `dev-workflow:dev-review`) and a doc-drift reviewer (`dev-workflow:dev-sync-reviewer`, spawned by `dev-workflow:dev-sync`). Additional Reviewers are for concerns beyond these — e.g. fork maintenance, framework conventions, domain-specific rules.

## Phase 3: Apply

Use AskUserQuestion to let the user accept/reject per group (or item for contentious ones). Then:

1. Write or update **only** the contract block in CLAUDE.md (see schema below). Never restructure or reformat content outside the markers.
2. Create accepted reviewer agents in `.claude/agents/` (keep them focused: one concern per reviewer, with a description saying when dev-review should spawn it).
3. Report what was applied and what was skipped.

## Re-runs: validate & migrate

If a contract block already exists:

1. Compare its version marker against the current schema version (below).
2. Same version → validate contents: do the commands still exist in the manifests? Do referenced docs/agents still exist? Report drift.
3. Older version → show the diff between current block and migrated block, ask, then rewrite the block in place.

## Contract Schema (v1)

The contract lives in the repo's CLAUDE.md inside bounded markers. Everything between the markers is owned by this skill; everything outside is owned by the repo.

```markdown
<!-- dev-workflow-contract:v1:start -->
## Dev Workflow Contract

### Required Checks

- Format: `<command>`
- Lint: `<command>`
- Typecheck: `<command>`
- Test: `<command>`

### Situational Checks

- `<changed paths>` → `<command>`
- <prose condition, e.g. "user-facing flow changed"> → <skill/agent to run, or CI check to watch>

### Review Inputs

- Code standards: `<path>`
- Testing standards: `<path>`

### Additional Reviewers

- `<agent-name>` — <what it reviews and when to spawn it>
<!-- dev-workflow-contract:v1:end -->
```

Rules:

- Omit sections that don't apply (e.g. no Additional Reviewers) rather than leaving placeholders.
- A repo may have no typecheck (e.g. plain JS) — drop the line, don't invent a command.
- Fused toolchains (Ruff, Biome/Ultracite) may not split format from lint: prefer a merged line when one command owns both, e.g. a single `Format + Lint:` entry pointing at `bun run fix`; keep them split when CI runs them as separate steps. Required Check commands are expected to auto-fix/mutate the working tree where the tool supports it — record the mutating form even when CI runs check-mode (`ruff format`, not `ruff format --check`).
- Required Checks may carry extra labeled lines beyond the four standard ones when a check gates every PR in CI **and** applies regardless of which files changed (e.g. a `Security:` line for a SAST scan) — path-conditional gates stay Situational. Record the exact command form CI fails on, not a variant.
- For **Test**, prefer the suite that gates every PR in CI. If a meaningfully different locally-runnable subset exists (e.g. a marker/filter), ask the user which to record; if the command is textually identical but environment-dependent (tests expect a local database), record it as-is and note the requirement. Slow or environment-dependent extra suites (E2E against ephemeral infra) go under Situational Checks.
- A Situational Check's action need not be a shell command: "watch the `<name>` CI check on the PR" (for CI-only checks) or "run the `<name>` skill/agent" (for available validation tooling) are both valid.
- Commands must be copy-paste runnable from the repo root. Diff-scoped commands are allowed if that's what CI gates on — name the base branch explicitly (e.g. `--since=origin/main`). When CI is diff-scoped *because* repo-wide runs fail on pre-existing violations, record the diff-scoped mutating form — don't invent a repo-wide command the repo can't actually run clean.
- **Review Inputs** takes arbitrary labeled entries — register any doc reviewers should read (documentation guidelines, architecture, fork-maintenance rules, ...), not just code/testing standards.
- **Additional Reviewers** means beyond the plugin's built-in set (quality, test, and correctness reviewers spawned by dev-review; doc-drift reviewer spawned by dev-sync). Only list repo-specific ones; omit the section if there are none.
- Place the block after the repo's overview/commands sections (or at the end of CLAUDE.md if unsure) — never before `@import` lines at the top, and never inside or between another tool's managed region (vendored standards sections, other marker blocks).
- Keep the block compact: it is always-on context for every session in the repo.
