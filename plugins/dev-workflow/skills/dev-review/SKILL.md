---
name: dev-review
description: Independently review a completed change before pushing or opening a PR, or when a review is requested. Also use for requests to review code, check code quality, or perform a pre-PR review.
---

# Code Review

Run risk-scaled, multi-perspective review. During validation of an authorized implementation, fix verified issues directly. For review-only requests, report findings without editing; the fix actions below apply only within an authorized implementation.

This skill is the middle of `dev-check` → `dev-review` → `dev-sync`; its Proportionality Gate runs after `dev-sync`. Invoke workflow skills through the host's skill selector: `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex.

## Repository Contract

Follow the applicable repository and touched-directory instructions; read any missing from context and avoid rereading aliases of the same file. If both exist, follow both; the nearer-scoped file wins when they conflict. Find the repository's commands/checks, Review Inputs, and custom dev-workflow reviewers in whichever guidance file defines them.

## Choose the Review Target Once

Choose one target and pass the identical complete target to every reviewer:

- **Uncommitted**: staged, unstaged, and untracked files
- **Base branch**: the merge-base diff against the resolved upstream/base branch
- **Commit**: one named commit

For work that will become a PR, use the complete prospective PR diff: the base
branch diff plus any uncommitted and untracked files.

Inventory untracked files explicitly. Do not mutate the index merely to expose them. Paste their content into Claude reviewer prompts when practical; for Codex reviewers, name the paths and require direct inspection.

Prepare only:

- **Goal**: one sentence describing the intended outcome
- **Constraints**: hard requirements
- **Target**: target type/ref, complete changed-file list, diff or inspection instructions, and untracked paths
- **Review Inputs**: standards/documentation paths from repository guidance
- **Sibling paths**: the closest existing code paths you know for what the change does, as a codebase fact; reviewers may find closer ones

Do not include solution rationale, rejected alternatives, or the author's expected findings. Preserve independent judgment.

## Size Ledger

For work that will become a PR, record added and removed lines per kind when
review starts and again at the final head: for each PR and, in a
stack, for the combined diff from the stack's base. Keep the first record in
task context with the merge-risk baseline until the PR closes.

Each file belongs to the first kind that matches:

1. **generated**: lockfiles, generated code and snapshots, vendored files
2. **tests**: tests, fixtures, test harnesses and helpers
3. **docs**: documentation; agent instructions that define behavior, such as
   skills and prompts, are source
4. **source**: everything else

Count with `git diff --numstat -z -M <merge-base> <head>`; for an uncommitted
target, leave out `<head>` and count each untracked file's lines as added. A
kind's growth is its added lines at the final head minus those in the first
record, as a share of the first record.

## Scale to Risk

Reuse the tier chosen by `dev-check`; otherwise choose it now.

| Tier | Initial reviewers | Composition |
| --- | ---: | --- |
| **tiny** | 1 | One fresh broad correctness review (+ quality when tests or material contracts change); a prose-only change that alters no material contract skips the panel, since `dev-sync` reviews prose |
| **normal** | 2–3 | One broad correctness review plus 1–2 relevant specialists |
| **high-risk** | 5 | One broad correctness review plus four independent risk-focused specialists |

The main agent chooses specialist focus from structural simplicity plus lean cleanup, quality/tests, applicable repository-specific reviewers, existing-pattern reuse, external API verification, observability, security, or other change-specific risks. Always include a broad/unscoped review, except for that prose-only tiny case. Focus directs attention; it never partitions files. Every reviewer examines the complete target.

Prioritize an applicable repository-specific reviewer when its declared trigger matches. For high-risk work, include both structural-and-lean and quality unless a stronger repository-specific risk displaces one; fill remaining slots with independent focused reviews. Whenever the target adds, changes, or removes tests, or changes a material contract without touching tests, include the quality reviewer at every tier for its test-value verdicts; it cannot be displaced then.

### Let the merge-risk level set the budget

When the work has a merge-risk level (the plan baseline, or the diff rating
once it exists), it sets the review budget in place of the tier; the tier still
sets `dev-check`'s scope. More rounds buy safety where a mistake is costly, not
polish.

| Level | Panel | Fresh final gates |
| --- | --- | --- |
| **low** | tiny | at most one, only when a fix changed behavior |
| **typical** | normal, at its low end | at most one, only when review produced fixes |
| **high**, **very_high** | high-risk | at least one, at most two |

Work that `dev-check` rated high-risk for auth, data migrations or public APIs
keeps the high-risk panel whatever its level. On low and typical work, report
P3 and style notes instead of fixing them. When the diff rating's budget is
bigger than the one that ran, the remaining rounds follow it (see Merge Risk);
reviewers that already ran are not repeated.

## Merge Risk

When the change will be published as a PR, run the `merge-risk` skill's diff
mode on the same target once the initial panel's fixes are in, before the final
gate; it does not count toward the panel. It is the one reviewer that receives
the plan's baseline profile. Handle its drift list as that skill describes,
inside this review loop. When its level calls for a bigger panel than the one
that ran, with or without a plan, run the added slots before the final gate.

## Internal Reviewer Contracts

Reviewer contracts are non-invokable reference files adjacent to this skill:

- `references/structural-lean-reviewer.md`
- `references/quality-reviewer.md`
- `references/correctness-reviewer.md` (fallback)
- `references/comparison-bar.md`: the parity bar for every code reviewer in the
  panel and final gates except structural-and-lean. The correctness and quality
  contracts load it; paste its content into every other one's prompt
  (`codex-review` sessions, `$review-agent`, repository-specific reviewers).

Resolve their absolute paths from this skill's directory. Every delegated specialist must read its complete contract before reviewing. Make loading fail closed: if the reference cannot be read, the reviewer must stop and report the path/error instead of performing a generic review.

## Host Adapters

Read and apply the shared sub-agent model policy at
`../../references/sub-agent-model-policy.md` to every review sub-agent launch.

### Claude Code

- Launch the plugin's thin `dev-structural-lean-reviewer` and `dev-quality-reviewer` agents when those focuses are selected; their wrappers load the canonical references through `${CLAUDE_PLUGIN_ROOT}`.
- Launch applicable project custom reviewers declared by repository guidance.
- Use independent `codex-review` MCP sessions for broad correctness or additional Codex-focused perspectives. In the pinned MCP contract, typed `uncommitted`/`base`/`commit` modes cannot carry review instructions, so use `mode: "custom"` and put the exact target-inspection instructions, goal, constraints, Review Inputs, sibling paths, the comparison bar, untracked paths, and focus in `prompt`. Do not attach a prompt to a typed mode: it is ignored. If Codex MCP is unavailable, state the fallback and give the required broad review and each focused slot without a plugin agent (such as security or observability) its own fresh `dev-correctness-reviewer`, with the focus in its prompt.
- Paste the actual diff into Claude reviewer prompts because the read-only agents may not have shell access. For very large targets, include the complete file list/stat plus risky hunks and require direct reads of every remaining changed file.

### Codex

- Use `spawn_agent` for the initial fan-out. Keep reviewers read-only and tell them not to delegate.
- For broad correctness reviews, explicitly require the built-in `$review-agent` contract. Give the exact uncommitted/base/commit target, Review Inputs, sibling paths, the comparison bar, and untracked paths.
- For structural-and-lean and quality specialists, pass the resolved absolute internal-reference path and require fail-closed loading before inspection.
- Launch applicable project `.codex/agents/*.toml` reviewers by their declared names. Those wrappers must load their one canonical repository contract.
- Let reviewers inspect the shared checkout directly; do not paste the full diff unless filesystem access is unavailable.

If a named mechanism is unavailable on the current host, use its closest read-only delegation mechanism while preserving the same contract, target, and independence. Report the fallback rather than implying a reviewer participated.

## Collect, Verify, and Classify

Reviewer findings are hypotheses. Before fixing a behavioral claim, prove or disprove it through code tracing, a reproducing snippet, or a targeted test.

| Class | Meaning | Action |
| --- | --- | --- |
| **already-addressed** | Existing code/test already covers it | Note and skip |
| **false-alarm** | Claim does not match verified behavior | Skip |
| **real-fix** | Defect | Fix directly; add a regression test only when it passes the repository's testing standards, or the workflow's test bar when it declares none |
| **accepted-limit** | Real defect whose fix the comparison bar does not require | Leave the code; report the limit and the remedy's cost |
| **optional** | Subjective trade-off, no defect | Leave the code; report it as optional |

Verify `beyond-parity` tags and sibling and cost claims like any other claim.

## Root-Cause Reflection

Before fixing and before further review, inspect findings as a set. If several cluster around the same abstraction, data flow, or repeatedly patched area, stop patch stacking. Name the root cause, evaluate a structural fix, and prefer deletion/refactoring when tests already pass.

## Bounded Re-Review

Do not rerun the full panel after every fix.

1. Send a bounded follow-up to the reviewer that found a fixed issue and ask it to verify only the affected changed files plus its prior finding. In Codex, use `followup_task` when available.
2. After all fixes, run a **fresh broad correctness review** of the complete updated target when the budget above calls for one. Without a merge-risk level: always for high-risk work; for tiny/normal work, when review produced fixes.
3. On Claude Code, use a fresh `codex-review` session for the final gate, falling back explicitly to `dev-correctness-reviewer` when Codex MCP is unavailable.
4. On Codex, use a fresh sub-agent with `$review-agent`.
5. Allow at most the budget's fresh final gates after the initial panel, or **two** without a merge-risk level; targeted follow-ups do not count toward this ceiling. Stop earlier when a final review has no actionable findings. A result containing only P3/style suggestions ends the loop and is reported as optional. If the last allowed gate still has actionable findings, or its fixes would need another gate, stop and present the residual findings and root-cause concern to the user.

## Report and Continue

Report what was fixed, decisions still needed, root-cause concerns, reviewer participation/fallbacks, and whether the final gate passed. Continue to `dev-sync`, then the Proportionality Gate, unless the user requested review only.

## Proportionality Gate

After `dev-sync` and before a PR is called ready, make one subtraction pass
over each PR's final diff and, for a stack, over the combined diff. Review
rounds only add; this pass takes the excess back out. Its cuts do not reopen
the review loop.

- **Who**: a self-check against the structural-and-lean contract's Pass 2.
  Launch an independent structural-and-lean reviewer, as Host Adapters
  describe, for a stack's combined diff, attributing each finding to its PR,
  and for a non-tiny PR whose source or tests grew more than about 20% during
  review.
- **Test value**: when the final diff adds, changes or removes tests, get the
  quality contract's test-value verdicts on it, by a bounded follow-up to the
  panel's quality reviewer or a fresh one when none ran. Fill a missed-risk gap
  only under the `real-fix` test rule above.
- **Act**: cut each concrete excess or justify keeping it in one line, fix
  prose the cuts make false, and rerun the checks the cuts affect. A cut to
  trust-boundary or security code gets a bounded follow-up from the final-gate
  reviewer. When a cut changes behavior on an open PR, refresh its card under
  the `merge-risk` skill's Freshness rule.
- **Size**: record the final ledger. When test lines exceed source lines, or
  source or tests grew more than about 20% during review, explain each kind's
  size in one sentence and justify each test case the PR adds by the failure
  only it detects. The ratio prompts an explanation; it is not a verdict.

Report the cuts with the lines they removed, what was kept and why, both ledger
records, and any sentences and test justifications the size rule asked for.
