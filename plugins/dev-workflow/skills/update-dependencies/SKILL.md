---
name: update-dependencies
description: Audit or safely update project dependencies across package managers. Use when the user asks what is outdated, wants to upgrade packages, assess breaking changes, review version constraints, or prepare dependency-update commits.
---

# Update Dependencies

Discover dependency domains, assess update impact, and make small, reversible
changes without assuming one language or package manager.

## Authority and modes

Infer the mode from the request:

- **Audit**: inventory, research, and recommend. Do not install, sync, relock,
  edit files, or otherwise mutate the project or its environment.
- **Update**: dependency files and required migrations may be edited.
  Commits, pushes, PRs, toolchain self-updates, and policy bypasses require
  separate explicit authorization.

Focus on named packages and any compatibility-coupled dependencies. Without
named packages, provide an overview before selecting update groups.

## 1. Load repository policy

Read every applicable `AGENTS.md` and `CLAUDE.md`, including Commands &
Checks, Situational Checks, Review Inputs, and custom reviewers. Read referenced
dependency policy plus relevant manager, CI, and release configuration.
Repository policy wins.

Do not update a package manager or runtime merely because a newer version
exists; treat that as a separately requested toolchain change, especially when
the repository pins it.

## 2. Discover and protect dependency domains

Resolve the Git root with `git rev-parse --show-toplevel`. From that root, use
`git -C <repo-root> ls-files --cached --others --exclude-standard` to find
manifests, inline dependency metadata, lockfiles, workspace declarations, and
manager configuration. Do not let the invocation directory narrow discovery or
scan ignored dependencies, generated output, caches, or nested worktrees.

A **dependency domain** is one manager root, its owned declarations, and its
lockfile when policy commits one. A domain may intentionally be lockfile-free.
Associate workspace members with their owner, preferring the nearest lockfile
for intentionally independent subtrees. Treat each tracked Python script with a
PEP 723 `# /// script` block as a UV domain whose manifest is the script and
whose optional sidecar is `<script>.lock`; require policy evidence before
calling a missing sidecar intentional.

For each domain, record:

- root, manager/version, declarations, workspace members, and lockfile policy;
- resolution settings, release-age rules, patches, overrides, alternate
  sources, catalogs, and vendored dependencies;
- lifecycle hooks or generators and every path they may change;
- current tracked and untracked changes to those guarded paths.

Work on one domain at a time and run its manager only from that domain or the
explicit owning member.

### Mutation safety

Record the full initial status as the user-owned baseline. Unrelated changes do
not block the workflow and must remain untouched. If baseline changes overlap a
domain's guarded files, keep that domain in audit mode and ask how to isolate
them; never stash or discard them automatically.

Guard declarations, existing lockfiles, resolution configuration, patch/vendor
artifacts, migration targets, tests, and bounded hook/generator outputs. Before
each group:

1. Confirm existing guarded changes belong only to completed groups.
2. Capture a path-scoped snapshot or reversible patch from that authorized
   state.
3. Record full status before and after every mutation, attribute expected
   changes, and stop before another command if an unexpected path changes.

Verify a newly discovered migration target is clean before extending the
checkpoint and editing it. If a hook's output cannot be bounded, require a clean
tree or explicit authorization for its declared scope. Roll back only
group-owned files to the checkpoint, preserving unrelated work and earlier
groups; never use broad checkout/restore globs. Whenever no verified safe
procedure or required authorization exists, keep the domain in audit mode.

## 3. Map package-manager capabilities

These are verified examples for lockfile-backed domains, not universal syntax:

| Operation | UV | Bun |
| --- | --- | --- |
| Tool version | `uv --version` | `bun --version` |
| Check declaration/lock agreement | `uv lock --check` | `bun install --frozen-lockfile --dry-run` |
| Check installed environment | `uv sync --all-packages --all-groups --all-extras --check` | use repository guidance or report unavailable |
| List outdated | `uv tree --outdated --frozen --universal --all-groups` | `bun outdated` outside workspaces; explicit `--filter` selectors in workspaces |
| Update within ranges | `uv lock --upgrade-package <pkg>` | `bun update --cwd <owner-root> <pkg>` |
| Cross a range deliberately | edit the declaration, then `uv lock --upgrade-package <pkg>` | `bun update --cwd <owner-root> --latest <pkg>`, or edit then `bun install --cwd <owner-root>` |
| Synchronize | `uv sync --all-packages --all-groups --all-extras` | `bun install` |

For a lockfile-backed PEP 723 script, use verified `--script <script>`
equivalents for `uv lock --check`, `uv sync --check`,
`uv tree --outdated --frozen --universal`, targeted locking, and sync; do not
add project/workspace flags. For an intentionally sidecar-free script, skip
lock checks and `--frozen`. Use
`uv tree --script <script> --outdated --universal` only after proving the
installed UV version preserves sidecar absence and changes no project files;
otherwise report outdated discovery as unavailable.

For Bun workspace audits, include the root with `--filter="./"` and every
discovered member with `--filter="./<member-path>"`. Repeat filters only when
the installed version supports it; otherwise run one read-only command per
selector. Do not rely on default scope, `--recursive`, or a name glob for
complete coverage. For updates, `<owner-root>` is the domain root or the
member owning the declaration. Verify that member-scoped updates preserve the
shared lockfile.

An intentionally lockfile-free domain needs a verified no-lock procedure:

- Bun: edit the declaration, then use
  `bun install --cwd <owner-root> --no-save` or
  `bun update --cwd <owner-root> --no-save <pkg>`.
- UV project: avoid `uv lock` and project `uv sync`; use the approved
  environment and a verified `uv pip` command such as
  `uv pip install -e .` with required groups/extras.
- Sidecar-free PEP 723 script: verify `uv sync --script <script>` preserves
  sidecar absence; run `uv run --script <script>` only when executing the
  script is authorized.

Confirm every no-lock flag and its semantics against the pinned or installed
manager version and CLI help. Derive an equivalent for other managers; if none
exists, remain in audit mode.

Never create a missing lockfile without repository-policy or explicit user
authorization. No-lock environment commands do not replace declaration edits
or exact-sync policy.

Use workspace flags only for proven workspaces. Reconcile outdated output
against owned declarations and focus decisions on direct dependencies. Carry
the affected dependency groups through discovery, environment checks, updates,
and sync; carry extras through every supporting operation. Confirm support for
every group/extra flag used, including `--all-groups` and `--all-extras`, in the
domain's UV version.

For npm, Poetry, pnpm, Yarn, Cargo, or another manager, derive the same
capabilities from repository guidance, installed CLI help, and current official
documentation. Before mutation, report the domain root and exact commands for
lock checks, non-mutating environment checks when available, outdated discovery,
within-range update, deliberate range crossing, synchronization, and rollback.
Never infer flags from UV or Bun examples.

## 4. Inventory and assess impact

For each direct dependency in scope, identify:

- owning declaration and dependency section/group;
- declared constraint and locked version, or lockfile absence plus whether the
  declaration is exact or ranged and any repository-authoritative current
  baseline;
- latest constraint-allowed, release-age-eligible, and published stable version;
- workspace, peer, runtime, and platform compatibility constraints.

Do not bypass `exclude-newer`, minimum-release-age, registry, or provenance
policy. Report policy-held releases instead of calling the domain up to date.
Treat exact pins, upper bounds, prerelease ranges, runtime constraints, and
coordinated versions as potentially deliberate; do not relax them or cross a
major/pre-1.0 boundary without evidence and a deliberate decision.

Check patches, overrides, vendoring, Git/local sources, peers, and framework
coupling. Treat patched or overridden dependencies as focused high-risk groups;
update supporting artifacts atomically or defer them.

Use current authoritative release notes, migration guides, advisories, and
registry metadata for the exact current-to-target interval. Inspect imports,
changed or deprecated APIs, integration boundaries, deployment/package-size
effects, and focused tests. Summarize evidence before updating:

| Package/group | Current | Target | Owner | Relevant changes | Code impact | Risk |
| --- | --- | --- | --- | --- | --- | --- |

Label uncertainty; successful resolution does not prove API compatibility.

## 5. Plan and execute update groups

Use the fewest independently reversible groups that preserve compatibility:

- bulk compatible patches and clearly low-risk minors;
- resolver-coupled or version-aligned clusters;
- risky minors, majors, prereleases, and runtime/tooling changes individually;
- patched, security-sensitive, storage, auth, or core-infrastructure packages
  with focused integration checks.

Keep a required migration with the version that needs it. Each group must leave
declarations and any existing lockfile synchronized and the tree runnable while
preserving intentional lockfile absence. Split constraint policy from a version
bump only when relocking moves no package version; otherwise keep constraint,
resolution, and migration atomic.

For each group:

1. Capture the mutation-safety checkpoint and run the selected update command.
2. Inspect declaration, lockfile, patch, and transitive-version diffs; investigate
   unexpected movement.
3. Synchronize without changing install policy or disabling lifecycle scripts.
4. Apply the smallest required migration and run focused plus applicable
   Situational Checks.
5. On failure, fix the evidenced root cause, choose a lower compatible target,
   defer, or restore the group checkpoint and re-synchronize.

After three failed fixes for one issue, reassess the target, constraint, or
grouping assumption before trying again.

Do not commit between groups. Retain checkpoints until every group and final
validation pass. If commits are authorized, create the validated series
afterward, preferably one commit per independently reversible group; otherwise
only propose the series.

## 6. Final validation and report

In audit mode, stop after the read-only report; do not invoke validation skills
that may auto-fix.

In update mode, run `dev-check` at normal tier for declaration/resolution
changes and high-risk for major crossings or application migrations. Tiny is
only for metadata-only lockfile changes where no resolved version moved. Use
check-only repository-wide commands. Auto-fix only update-caused failures or
required migration/formatting changes; report unrelated findings unless
separately authorized. Before a permitted validation write outside a checkpoint,
verify it is clean, extend the checkpoint, and obtain authorization.

Continue through `dev-review`, then invoke the canonical `dev-sync` reviewer
directly in read-only mode, including for tiny diffs. If review or validation
changes files after the last `dev-check`, rerun all Required and newly
applicable Situational Checks before creating commits. Report sync drift under
the same authorization boundary.

Invoke as `/dev-workflow:<name>` in Claude Code or
`$dev-workflow:<name>` in Codex.

Report:

- updates by domain/group and relevant release changes;
- declaration, lockfile-policy/change, patch, and application migrations;
- verification and environmental limitations;
- skipped, policy-held, or deferred packages with reasons;
- proposed commit series and whether anything was committed.
