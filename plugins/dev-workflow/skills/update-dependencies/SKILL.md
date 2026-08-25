---
name: update-dependencies
description: Audit or safely update project dependencies across package managers. Use when the user asks what is outdated, wants to upgrade packages, assess breaking changes, review version constraints, or prepare dependency-update commits.
---

# Update Dependencies

Discover the repository's dependency domains, research update impact, and make
small, reversible dependency updates without assuming one language or package
manager.

## Authority and modes

Infer the mode from the request:

- **Audit**: inventory, research, and recommend. Do not install, sync, relock,
  edit files, or otherwise mutate the project or its environment.
- **Update**: dependency-file and required migration edits are authorized.
  Commits, pushes, PRs, toolchain self-updates, and bypassing repository policy
  are not authorized unless the user explicitly says so.

If the user named packages, focus on them and any coupled packages required for
a coherent update. Otherwise, provide an overview before selecting update
groups.

## 1. Load repository policy

Read every applicable `AGENTS.md` and `CLAUDE.md`, including Commands & Checks,
Situational Checks, Review Inputs, and custom reviewers. Read dependency-policy
documents named there and relevant manager configuration, CI, and release docs.
Repository policy wins over the defaults in this skill.

Do not update the package manager or runtime merely because a newer version
exists. Treat toolchain upgrades as a separate, explicitly requested change,
especially when the repository pins them.

## 2. Discover dependency domains

Resolve the repository root with `git rev-parse --show-toplevel`, then use
Git's view from that root (`git -C <repo-root> ls-files --cached --others
--exclude-standard`) to enumerate manifests, lockfiles, workspace declarations,
and manager configuration. Do not let the invocation directory narrow the
inventory. Do not use an unrestricted filesystem scan: ignored dependencies,
generated output, caches, and nested worktrees are not project domains.

A **dependency domain** is one package-manager root, its owned manifests, and
its lockfile when repository policy commits one. A domain may intentionally be
lockfile-free, especially for a published library. Associate workspace-member
manifests with their owning root; prefer the nearest nested lockfile when a
subtree is intentionally independent.
Examples include a root Bun application plus a nested npm-only release tool, or
a UV workspace with many `pyproject.toml` members and one root `uv.lock`.

For each domain, record:

- root, manager/version, owned manifests, workspace members, and lockfile
  presence or intentional-absence policy;
- resolution-affecting configuration and publication-age/quarantine settings;
- patches, overrides, alternate sources, catalogs, or vendored dependencies;
- install/update lifecycle hooks, code generators, and their possible outputs;
- current changes to these guarded files.

Work on one domain at a time. Never run one domain's package manager from
another domain's root.

### Dirty-file gate

Unrelated working-tree changes do not block the workflow and must remain
untouched. At workflow start, record the full tracked and untracked status as
the initial user-owned baseline. If a domain's guarded files are changed in that
baseline, remain in audit mode for that domain and ask how the user wants to
isolate or reconcile them. Do not stash or discard them automatically.

Guarded files include the domain's manifests, existing lockfile, resolution
configuration, referenced patch/vendor artifacts, and every application or test
file the planned migration or an applicable lifecycle hook/generator may edit.
Before each update group, verify that guarded-file changes belong only to
completed groups; reject newly detected unowned changes. Record a path-scoped
snapshot or reversible patch from that current authorized state so rollback
preserves earlier successful groups. If hook output cannot be bounded, require
a clean working tree or explicit authorization for its declared write scope;
otherwise keep the domain in audit mode. Record full tracked and untracked
status before and after every mutation, attribute expected changes to their
owning group, and stop before another command if an unexpected path changes. If
a new migration target is discovered later, check it and extend the checkpoint
before editing it. Rollback must restore every file owned by the group to that
checkpoint, preserving unrelated files and earlier successful groups. Never use
broad checkout/restore globs.

## 3. Map package-manager capabilities

Use these verified examples for lockfile-backed domains as a capability map,
not as universal syntax:

| Operation | UV | Bun |
| --- | --- | --- |
| Tool version | `uv --version` | `bun --version` |
| Check manifest/lock agreement | `uv lock --check` | `bun install --frozen-lockfile --dry-run` |
| Check installed environment without changing it | `uv sync --all-packages --all-groups --all-extras --check` | no equivalent listed; use repository guidance or report unavailable |
| List outdated from the lock/project | `uv tree --outdated --frozen --all-groups` | `bun outdated` for one package root; `bun outdated --recursive` for every workspace member |
| Update within declared ranges | `uv lock --upgrade-package <pkg>` | `bun update <pkg>` |
| Deliberately cross a range | edit the owning manifest, then `uv lock` | `bun update --latest <pkg>` or edit the manifest, then `bun install` |
| Synchronize | `uv sync --all-packages --all-groups --all-extras` | `bun install` |

An intentionally lockfile-free domain must use a verified no-lock procedure;
do not run a table command that creates a lockfile by default. For Bun, edit the
manifest when needed, then use `bun install --no-save` or
`bun update --no-save <pkg>` to update the environment without saving a
lockfile. For UV, avoid `uv lock` and `uv sync`; use the repository-approved
environment and a verified `uv pip` command such as `uv pip install -e .` with
the required groups or
extras. Confirm every no-lock flag and its semantics against the domain's pinned
or installed manager version and CLI help; if that cannot be verified, remain
in audit mode. These environment-facing commands do not replace manifest edits
or an exact-sync policy; report any limitation. For another manager, derive and
report its no-lock equivalent before mutation. If none exists, remain in audit
mode. Never create a missing lockfile unless repository policy or the user
explicitly authorizes it.

Use workspace flags only when discovery proves the domain is a workspace. An
outdated command may include transitive packages; reconcile its output against
owned manifests and focus decisions on direct dependencies. Carry the same
affected dependency-group selection through outdated discovery, environment
checking, updating, and synchronization. Carry affected optional-extra
selections through environment checking and synchronization, plus other
operations that support them. Use explicit `--group`/`--extra` selections or
`--all-groups`/`--all-extras` only after confirming support in the domain's UV
version.

For npm, Poetry, pnpm, Yarn, Cargo, or another manager, derive the same
capabilities from repository documentation, the installed CLI's help, and
current official documentation. Before the first mutation, report the exact
domain root and commands selected for lock checking, environment checking when
available, outdated discovery, within-range updates, deliberate range crossing,
synchronization, and rollback. Do not infer flags from the UV or Bun examples.

## 4. Inventory and policy audit

For each direct dependency in scope, identify:

- owning manifest and dependency section/group;
- declared constraint and currently locked version when a lockfile exists;
  otherwise record lockfile absence separately, characterize whether the
  manifest constraint is exact or ranged, and use another repository-authoritative
  current baseline when one exists;
- latest version allowed by the constraint;
- latest version eligible under publication-age policy;
- latest published stable version;
- workspace, peer, runtime, or platform compatibility constraints.

Do not bypass `exclude-newer`, minimum-release-age, registry, or provenance
policy to reach a newer version. Report policy-held releases explicitly rather
than calling the domain fully up to date.

Audit constraints using the ecosystem's semantics and repository policy. Exact
pins, upper bounds, prerelease ranges, runtime constraints, and coordinated
versions may be deliberate. Do not relax them or cross a major/pre-1.0 boundary
without evidence and a deliberate decision.

Check whether each target is patched, overridden, vendored, sourced from Git or
a local path, or coupled to peers/framework packages. A patched or overridden
dependency is a focused high-risk group: update or regenerate its supporting
artifact atomically, or defer it.

## 5. Research and assess impact

Use current authoritative release notes, migration guides, advisories, and
registry metadata for the exact current-to-target interval. In parallel when
available, inspect the repository for imports, changed/deprecated APIs,
integration boundaries, package-size/deployment effects, and focused tests.

Summarize the evidence before updating:

| Package/group | Current | Target | Owner | Relevant changes | Code impact | Risk |
| --- | --- | --- | --- | --- | --- | --- |

Label uncertain conclusions and do not equate a successful resolution with API
compatibility.

## 6. Plan update groups

Prefer the fewest independently reversible groups that preserve compatibility:

- bulk compatible patches and clearly low-risk minors;
- resolver-coupled or framework/version-aligned clusters;
- risky minors, majors, prereleases, and runtime/tooling changes individually;
- patched, security-sensitive, storage, auth, or core-infrastructure packages
  with focused integration verification.

Keep a required code migration in the same group as the dependency version that
needs it. Every group must leave manifests and any existing lockfile synchronized
and the tree runnable. Preserve an intentional no-lockfile policy. Split a
constraint-policy-only change from a version bump only when relocking moves no
package versions; otherwise keep the constraint, resolved version, and migration
atomic.

Do not commit between update groups. Retain per-group checkpoints until every
group is complete and the final `dev-check`, `dev-review`, and `dev-sync` gates
pass. If commits were explicitly authorized, create the validated commit series
after those gates, using one commit per independently reversible group when
practical. Otherwise, present the proposed series without committing.

## 7. Update and verify one group at a time

For each group:

1. Record the path-scoped checkpoint and run the selected update command from
   the domain root.
2. Inspect manifest, existing-lockfile, patch, and transitive-version diffs. Investigate
   unexpected movement instead of accepting resolver output wholesale.
3. Synchronize the domain without changing repository install policy or
   silently disabling lifecycle scripts.
4. Apply the smallest required migration and run focused checks for the
   affected integration plus applicable Situational Checks.
5. On failure, use the release/code-impact evidence to fix the root cause,
   choose a lower compatible target, defer the group, or restore only the
   recorded group checkpoint and re-synchronize.

Stop after three failed fixes for the same issue and reassess the target,
constraint, or grouping assumption before trying again.

## 8. Final validation and report

In audit mode, stop after the read-only report below. Do not invoke validation
skills that can auto-fix files.

In update mode, run the repository's `dev-check` workflow using a tier
proportional to the final diff: normal for resolved-version or manifest changes,
and high-risk for major crossings or application migrations. Use tiny only for
a genuinely behavior-neutral metadata-only lockfile change where no resolved
version moved. Use non-mutating/check-only variants for repository-wide commands.
Allow automatic fixes only for update-caused failures or required migration and
formatting changes; report unrelated findings even when they occur in a
checkpointed file unless the user separately authorizes them. Before any
permitted validation write outside the checkpoint, verify the target is clean,
extend the checkpoint, and obtain authorization. Then continue through
`dev-review`. For `dev-sync`, invoke its canonical sync reviewer contract
directly in read-only mode even when the final diff is tiny; do not use the tiny
auto-fix path. Report newly discovered drift under the same boundary. If
`dev-review` or another validation step changes files after the last
`dev-check`, rerun all Required Checks and newly applicable Situational Checks
before creating the validated commit series.

Invoke them as `/dev-workflow:<name>` in Claude Code or
`$dev-workflow:<name>` in Codex.

Report:

- updated packages by domain/group and their relevant release changes;
- manifest, lockfile presence or changes, patch, and application migrations;
- verification performed and any environmental limitations;
- skipped, policy-held, or deferred packages with reasons;
- proposed commit series, while clearly stating whether anything was committed.
