---
name: setup
description: Set up or validate a repository's dev-workflow configuration in CLAUDE.md. Use when onboarding a repo to the org dev workflow, when the commands/checks sections in CLAUDE.md are missing or outdated for the installed plugin version, or when the user asks to "set up the dev workflow", "onboard this repo", "check the workflow config", or wants recommendations for workflow improvements (reviewers, checks, skills).
---

# Dev Workflow Setup

Act as a workflow consultant for this repository: inspect it, recommend how it should plug into the org dev workflow, and apply only what the user accepts.

The workflow skills read their repo-specific configuration from ordinary CLAUDE.md sections (see **Conventions** below) — no special markup, just well-structured documentation that serves humans and agents alike.

Three phases, always in order: **Inspect → Recommend → Apply**.

**Dry run**: if the user asked for recommendations only, stop after Recommend and present anything that would have been an AskUserQuestion as an open question with your recommended default.

## Phase 1: Inspect

Gather evidence before recommending anything. Look at:

- **Stack & tooling**: manifest files (`pyproject.toml`, `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, ...), lockfiles, and the scripts/tasks they define (format, lint, typecheck, test)
- **CI config** (`.github/workflows/`, etc.): which checks actually gate merges — these are the ground truth for required checks
- **Existing Claude assets**: `CLAUDE.md` (do the conventions sections exist and match reality?), `.claude/skills/`, `.claude/agents/`, `.claude/settings.json` hooks
- **Docs**: code standards, testing guidelines, architecture docs — candidates for Review Inputs
- **Repo shape signals**: upstream remotes or fork markers, `custom/` directories, monorepo/workspace layout, generated code, infra-as-code — anything that suggests repo-specific reviewers or situational checks
- **Git history**: recently deleted or moved workflow assets (`git status`, `git log` on `.claude/`, CLAUDE.md) — repos migrating from a local workflow to this plugin often carry the strongest evidence in just-removed files

Use Explore agents for broad scans if available (otherwise search directly); read key files directly. Every later recommendation must cite evidence found here (a file path or observed pattern). If you can't cite evidence, don't recommend it.

Also check symlinks in **both** directions between `CLAUDE.md` and `AGENTS.md` (e.g. `CLAUDE.md → AGENTS.md`, or `AGENTS.md → CLAUDE.md`): edits land in the physical target and fan out to every consumer of the linked file (e.g. Codex reads AGENTS.md). Always write the physical file — never retarget — and name the fan-out in your report (interactive runs: before applying).

## Phase 2: Recommend

Present findings in three groups:

- **Required** — the repo can't run the workflow without these: the commands/checks sections themselves, and any check command that couldn't be detected. Phrase undetectable commands as explicit questions with your recommended default (in a dry run, list them as open questions in the report)
- **Recommended** — clear evidence supports these: e.g. "upstream remote + `custom/` dir → add a fork-maintenance reviewer agent", "CI runs an e2e suite → add it as a situational check", "docs/guides/code-standards.md exists → register as review input"
- **Optional** — useful but judgment-call: extra skills, hook cleanups, CLAUDE.md improvements

For each item: what, why (with evidence citation), and what applying it would change. Propose — never adopt silently. Anything touching branch/release policy, security, or hooks is always proposed, never auto-applied.

If the repo already encodes checks elsewhere (a local `dev-check`-style skill, duplicated prose in CLAUDE.md), the conventions sections become the single source of truth: recommend updating those assets to point there or removing the duplication. The same applies to CLAUDE.md content duplicating a skill this plugin actually ships (check the plugin's skill list) — never recommend removing content whose only copy lives in the repo.

If the plugin itself isn't enabled in the repo's `.claude/settings.json` yet, recommend the `enabledPlugins` entry — together with the `extraKnownMarketplaces` entry if the marketplace is missing too (an enabled plugin from an unknown marketplace won't load on a fresh checkout). Apply only with explicit user acceptance (it's a settings edit).

Do **not** recommend reviewers or checks the plugin already provides: the workflow ships quality, test, and correctness reviewers (spawned by `dev-workflow:dev-review`) and a doc-drift reviewer (`dev-workflow:dev-sync-reviewer`, spawned by `dev-workflow:dev-sync`). Custom reviewers are for concerns beyond these — e.g. fork maintenance, framework conventions, domain-specific rules.

## Phase 3: Apply

Use AskUserQuestion to let the user accept/reject per group (or item for contentious ones). Then:

1. Write or update the conventions sections in CLAUDE.md (see below). Beyond those sections, touch only what the user explicitly accepted (de-duplication edits, settings entries) — never restructure or reformat anything else.
2. Create accepted reviewer agents in `.claude/agents/` (keep them focused: one concern per reviewer, with a description saying when dev-review should spawn it).
3. Apply accepted settings edits (`enabledPlugins` / `extraKnownMarketplaces`) in `.claude/settings.json`.
4. **No-loss audit**: diff everything you removed or replaced (sections, commands, prose — including accepted de-dup edits) and map each line to its new home (a conventions line, plugin skill/hook, repo doc). Anything unmapped gets restored before you finish. Removal is only ever justified by an existing replacement, never by tidiness.
5. Report what was applied, what was skipped, and the removal→home mapping.

## Re-runs: validate

If the conventions sections already exist, validate them: do the commands still exist in the manifests? Does CI gate checks that aren't recorded? Do referenced docs/agents still exist? Report drift, then offer to fix it via the normal Apply flow (in a dry run, report only). After plugin updates that change these conventions, do the same — semantically diff what's there against what's expected and propose the delta.

## Conventions

Two ordinary CLAUDE.md sections, located by meaning, not markup:

**1. A commands & checks section** — universal repo facts, useful in every session. Keep whatever heading the repo already uses (`## Commands & Checks`, `## Common Commands`, ...); create `## Commands & Checks` if none exists.

```markdown
## Commands & Checks

### Run

- `<command>` - <what it starts/does, e.g. run the app locally>

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
```

**2. A `## Dev Workflow` section** — plugin-specific configuration and repo refinements of the injected workflow:

```markdown
## Dev Workflow

<optional repo-specific refinements of the shared workflow>

### Custom dev-workflow reviewers

- `<agent-name>` — <what it reviews and when dev-review should spawn it>
```

Rules:

- Omit subsections that don't apply (e.g. no custom reviewers) rather than leaving placeholders. `Run` is optional convenience content — everyday commands (start the app, install deps) that belong with the check commands.
- **When restructuring an existing commands section, carry over ALL of its entries verbatim** (into `Run` or the matching check line) — never drop a documented command. These sections add structure on top of existing content; they don't shrink it.
- Preserve any repo-added subsections or content you don't recognize when validating — never drop repo-added content.
- A repo may have no typecheck (e.g. plain JS) — drop the line, don't invent a command.
- Fused toolchains (Ruff, Biome/Ultracite) may not split format from lint: prefer a merged line when one command owns both, e.g. a single `Format + Lint:` entry pointing at `bun run fix`; keep them split when CI runs them as separate steps. Required Check commands are expected to auto-fix/mutate the working tree where the tool supports it — record the mutating form even when CI runs check-mode (`ruff format`, not `ruff format --check`).
- Required Checks may carry extra labeled lines beyond the four standard ones when a check gates every PR in CI **and** can fail regardless of which files changed (e.g. a `Security:` line for a SAST scan). Checks that run on every PR but only fail on specific changes (lockfile validation) stay Situational. Record the exact command form CI fails on, not a variant.
- For **Test**, prefer the suite that gates every PR in CI. If a meaningfully different locally-runnable subset exists (e.g. a marker/filter), ask the user which to record; if the command is textually identical but environment-dependent (tests expect a local database), record it as-is and note the requirement. Slow or environment-dependent extra suites (E2E against ephemeral infra) go under Situational Checks.
- A Situational Check's action need not be a shell command: "watch the `<name>` CI check on the PR" (for CI-only checks) or "run the `<name>` skill/agent" (for available validation tooling) are both valid.
- Commands must be copy-paste runnable from the repo root. Diff-scoped commands are allowed if that's what CI gates on — name the base branch explicitly (e.g. `--since=origin/main`). When CI is diff-scoped *because* repo-wide runs fail on pre-existing violations, record the diff-scoped mutating form — don't invent a repo-wide command the repo can't actually run clean.
- **Review Inputs** takes arbitrary labeled entries — register any doc reviewers should read (documentation guidelines, architecture, fork-maintenance rules, ...), not just code/testing standards.
- **Custom dev-workflow reviewers** means beyond the plugin's built-in set (quality, test, and correctness reviewers spawned by dev-review; doc-drift reviewer spawned by dev-sync). Only list repo-specific ones; omit the subsection if there are none.
- Place new sections after the repo's overview sections (or at the end of CLAUDE.md if unsure) — never before `@import` lines at the top, and never inside another tool's managed region (vendored standards sections, other tools' marker blocks).
- Keep these sections compact: they are always-on context for every session in the repo.
