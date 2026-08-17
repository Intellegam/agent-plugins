---
name: setup
description: Set up or validate a repository's cross-host dev-workflow configuration in AGENTS.md and/or CLAUDE.md. Use when onboarding a repo, when commands/checks, reviewer configuration, or a promotion-policy pointer is missing or stale, or when the user asks to set up the dev workflow, check workflow config, or recommend checks and custom reviewers.
---

# Dev Workflow Setup

Act as a workflow consultant: inspect the repository, recommend how it should plug into the org workflow in Claude Code and Codex, and apply only what the user accepts.

Workflow skills read ordinary sections from applicable `AGENTS.md` and `CLAUDE.md` files (see **Conventions**). Keep one canonical copy of each repository contract and make both hosts follow it.

Three phases, always in order: **Inspect → Recommend → Apply**.

**Dry run**: if the user asked for recommendations only, stop after Recommend and present every unresolved choice as an open question with a recommended default.

## Phase 1: Inspect

Gather evidence before recommending anything. Look at:

- **Stack & tooling**: manifest files (`pyproject.toml`, `package.json`, `pom.xml`, `build.gradle`, `Cargo.toml`, ...), lockfiles, and the scripts/tasks they define (format, lint, typecheck, test)
- **CI config** (`.github/workflows/`, etc.): which checks actually gate merges — these are the ground truth for required checks
- **Existing agent assets**: `AGENTS.md`, `CLAUDE.md`, `.agents/skills/`, `.agents/reviewers/`, `.codex/agents/`, `.claude/skills/`, `.claude/agents/`, and host settings/hooks
- **Docs**: code standards, testing guidelines, architecture docs — candidates for Review Inputs
- **Promotion & release**: existing release/promotion docs, release workflows, versioning configuration, and any repository-local promotion skill — evidence for an optional promotion-policy pointer
- **Repo shape signals**: upstream remotes or fork markers, `custom/` directories, monorepo/workspace layout, generated code, infra-as-code — anything that suggests repo-specific reviewers or situational checks
- **Git history**: recently deleted or moved workflow assets under `.agents/`, `.codex/`, `.claude/`, `AGENTS.md`, or `CLAUDE.md`

Use the host's exploration agent for broad scans when available; otherwise search directly. Every recommendation must cite a file path or observed pattern.

Check symlinks in **both** directions between `CLAUDE.md` and `AGENTS.md`. Always write the physical target, never retarget a link, and name the fan-out before applying. When both are independent files, identify which already owns the workflow contract. Recommend one canonical owner plus a short explicit read/follow pointer from the other rather than duplicating the contract; ask before introducing that relationship.

## Phase 2: Recommend

Present findings in three groups:

- **Required** — the repo can't run the workflow without these: the commands/checks sections themselves, and any check command that couldn't be detected. Phrase undetectable commands as explicit questions with your recommended default (in a dry run, list them as open questions in the report)
- **Recommended** — clear evidence supports these: e.g. "upstream remote + `custom/` dir → add a fork-maintenance reviewer agent", "CI runs an e2e suite → add it as a situational check", "docs/guides/code-standards.md exists → register as review input"
- **Optional** — useful but judgment-call: extra skills, hook cleanups, or guidance-file improvements

For each item: what, why (with evidence citation), and what applying it would change. Propose — never adopt silently. Anything touching branch/release policy, security, or hooks is always proposed, never auto-applied.

When the repository has a release/promotion workflow or an existing local promotion skill, recommend one compact `Promotion policy` pointer under `## Dev Workflow Plugin`. Point to a normal human-facing repository document, with an optional heading anchor. Never create or infer the underlying branch/release policy silently; identify missing load-bearing facts as user decisions.

When a repository-local promotion skill exists, require an explicit **migrate or retain** decision. Recommend migration when the shared skill supersedes it: inventory its unique repository policy, move that policy to the accepted normal document, add the pointer, and retire the local skill only after every removed line has a mapped home or an explicit reason for removal. If the user retains it, leave it untouched, report the overlapping routing/behavior risk, and do not claim shared promotion onboarding is complete.

If the repo already encodes checks elsewhere, make the accepted conventions section the single source of truth: recommend pointers or removal of real duplication. Never remove content whose only copy lives in the repository.

For Claude Code, if the plugin is not enabled in `.claude/settings.json`, recommend the `enabledPlugins` entry plus its marketplace when missing. For Codex, report whether the plugin is unavailable from the configured marketplace; do not modify user-level Codex installation state as part of repository setup. Apply project settings only with explicit acceptance.

Do **not** recommend reviewers or checks the plugin already provides: structural-and-lean, quality, correctness, and documentation-sync contracts are built into the workflow. Custom reviewers are only for additional concerns such as fork maintenance, framework conventions, or domain rules.

## Phase 3: Apply

Use the host's structured user-input mechanism when available, otherwise ask directly, and let the user accept/reject each group or contentious item. Then:

1. When a promotion policy was accepted, write or update its normal human-facing document first. Include only user-approved intent and mechanics verified from live configuration; preserve unrelated existing content and ensure the accepted path/anchor exists.
2. When migration from a local promotion skill was accepted, map its complete content to the shared workflow, the normal policy document, or an explicit intentional removal before deleting or disabling it. When retention was accepted, leave the local skill unchanged and report that overlapping behavior remains.
3. Write or update the conventions section in the accepted canonical `AGENTS.md` or `CLAUDE.md`. If both independent files must serve as entry points, add only the accepted explicit pointer in the non-canonical file. Beyond accepted changes, do not restructure or reformat either file.
4. For every accepted custom reviewer, write the full contract once to `.agents/reviewers/<name>.md`.
5. Generate two thin wrappers that load that canonical contract and fail closed:
   - `.claude/agents/<name>.md` with Claude frontmatter (description, tools/model as accepted) and a body that reads `${CLAUDE_PROJECT_DIR}/.agents/reviewers/<name>.md`
   - `.codex/agents/<name>.toml` with `name`, `description`, `sandbox_mode = "read-only"`, and `developer_instructions` that reads `.agents/reviewers/<name>.md` from the project root
6. Apply accepted project settings edits. Do not duplicate reviewer bodies in either wrapper.
7. **No-loss audit**: map every removed/replaced line to its canonical new home. Restore anything unmapped, then report applied/skipped items and the mapping.

## Re-runs: validate

If conventions already exist, validate commands against manifests/CI and confirm Review Inputs, canonical reviewer contracts, and both host wrappers exist. When a promotion-policy pointer exists, validate the physical guidance target and symlink fan-out, the referenced path and optional heading anchor, and its agreement with live release configuration. Report drift and offer to fix it through the normal Apply flow.

## Conventions

Two ordinary sections in the chosen canonical `AGENTS.md` or `CLAUDE.md`, located by meaning rather than markup:

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

**2. A `## Dev Workflow Plugin` section** — plugin-specific configuration and repo refinements of the injected workflow:

```markdown
## Dev Workflow Plugin

<optional repo-specific refinements of the shared workflow>

- **Promotion policy**: `<repository-relative path or path#anchor>`

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
- **Custom dev-workflow reviewers** means beyond the built-in structural-and-lean, quality, correctness, and sync contracts. Only list repository-specific reviewers and omit the subsection when none exist.
- **Promotion policy** is optional. When present, validate that the referenced path and anchor exist and that its mechanical claims agree with live release configuration. Keep the actual policy in the referenced normal documentation; agent guidance contains only the pointer.
- Place new sections after repository overview sections (or at the end if unsure), never before Claude `@import` lines and never inside another tool's managed region.
- Keep these sections compact: they are always-on context for every session in the repo.
