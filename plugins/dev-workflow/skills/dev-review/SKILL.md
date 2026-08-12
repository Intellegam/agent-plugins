---
name: dev-review
description: This skill MUST be used before pushing or creating a PR. Proactively run it before any git push or PR creation and after dev-check. Also use when the user asks to review code, check code quality, find bugs, or run multi-perspective review.
---

# Code Review

Run risk-scaled, multi-perspective review. Fix verified obvious issues directly and ask only for non-obvious trade-offs.

This skill is the middle of `dev-check` → `dev-review` → `dev-sync`. Invoke workflow skills through the host's skill selector: `/dev-workflow:<name>` in Claude Code or `$dev-workflow:<name>` in Codex.

## Repository Contract

Read every applicable `AGENTS.md` and `CLAUDE.md` by directory scope. If both exist, follow both; the nearer-scoped file wins when they conflict. Find the repository's commands/checks, Review Inputs, and custom dev-workflow reviewers in whichever guidance file defines them.

## Choose the Review Target Once

Choose one target and pass the identical complete target to every reviewer:

- **Uncommitted**: staged, unstaged, and untracked files
- **Base branch**: the merge-base diff against the resolved upstream/base branch
- **Commit**: one named commit

Inventory untracked files explicitly. Do not mutate the index merely to expose them. Paste their content into Claude reviewer prompts when practical; for Codex reviewers, name the paths and require direct inspection.

Prepare only:

- **Goal**: one sentence describing the intended outcome
- **Constraints**: hard requirements
- **Target**: target type/ref, complete changed-file list, diff or inspection instructions, and untracked paths
- **Review Inputs**: standards/documentation paths from repository guidance

Do not include solution rationale, rejected alternatives, or the author's expected findings. Preserve independent judgment.

## Scale to Risk

Reuse the tier chosen by `dev-check`; otherwise choose it now.

| Tier | Initial reviewers | Composition |
| --- | ---: | --- |
| **tiny** | 1 | One fresh broad correctness review |
| **normal** | 2–3 | One broad correctness review plus 1–2 relevant specialists |
| **high-risk** | 5 | One broad correctness review plus four independent risk-focused specialists |

The main agent chooses specialist focus from structural simplicity plus lean cleanup, quality/tests, applicable repository-specific reviewers, existing-pattern reuse, external API verification, observability, security, or other change-specific risks. Always include a broad/unscoped review. Focus directs attention; it never partitions files. Every reviewer examines the complete target.

Prioritize an applicable repository-specific reviewer when its declared trigger matches. For high-risk work, include both structural-and-lean and quality unless a stronger repository-specific risk displaces one; fill remaining slots with independent focused reviews.

## Internal Reviewer Contracts

Reviewer contracts are non-invokable reference files adjacent to this skill:

- `references/structural-lean-reviewer.md`
- `references/quality-reviewer.md`
- `references/correctness-reviewer.md` (fallback)

Resolve their absolute paths from this skill's directory. Every delegated specialist must read its complete contract before reviewing. Make loading fail closed: if the reference cannot be read, the reviewer must stop and report the path/error instead of performing a generic review.

## Host Adapters

### Claude Code

- Launch the plugin's thin `dev-structural-lean-reviewer` and `dev-quality-reviewer` agents when those focuses are selected; their wrappers load the canonical references through `${CLAUDE_PLUGIN_ROOT}`.
- Launch applicable project custom reviewers declared by repository guidance.
- Use independent `codex-review` MCP sessions for broad correctness or additional Codex-focused perspectives. In the pinned MCP contract, typed `uncommitted`/`base`/`commit` modes cannot carry review instructions, so use `mode: "custom"` and put the exact target-inspection instructions, goal, constraints, Review Inputs, untracked paths, and focus in `prompt`. Do not attach a prompt to a typed mode: it is ignored. If Codex MCP is unavailable, state the fallback and use `dev-correctness-reviewer` for the required broad review.
- Paste the actual diff into Claude reviewer prompts because the read-only agents may not have shell access. For very large targets, include the complete file list/stat plus risky hunks and require direct reads of every remaining changed file.

### Codex

- Use `spawn_agent` for the initial fan-out. Keep reviewers read-only and tell them not to delegate.
- For broad correctness reviews, explicitly require the built-in `$review-agent` contract. Give the exact uncommitted/base/commit target, Review Inputs, and untracked paths.
- For structural-and-lean and quality specialists, pass the resolved absolute internal-reference path and require fail-closed loading before inspection.
- Launch applicable project `.codex/agents/*.toml` reviewers by their declared names. Those wrappers must load their one canonical repository contract.
- Let reviewers inspect the shared checkout directly; do not paste the full diff unless filesystem access is unavailable.

If a named mechanism is unavailable on the current host, use its closest read-only delegation mechanism while preserving the same contract, target, and independence. Report the fallback rather than implying a reviewer participated.

## Collect, Verify, and Classify

Reviewer findings are hypotheses. Before fixing a behavioral claim, prove or disprove it through code tracing, a reproducing snippet, or a targeted test.

| Class | Meaning | Action |
| --- | --- | --- |
| **already-addressed** | Existing code/test already covers it | Note and skip |
| **false-alarm** | Claim does not match verified behavior | Skip; optionally add a useful regression test |
| **real-fix-obvious** | Small, unambiguous defect | Fix directly |
| **real-fix-nonobvious** | Real but ambiguous or far-reaching | Present options to the user |
| **judgment-call** | Subjective trade-off | Present options to the user |

## Root-Cause Reflection

Before fixing and before further review, inspect findings as a set. If several cluster around the same abstraction, data flow, or repeatedly patched area, stop patch stacking. Name the root cause, evaluate a structural fix, and prefer deletion/refactoring when tests already pass. Present far-reaching structural decisions to the user.

## Bounded Re-Review

Do not rerun the full panel after every fix.

1. Send a bounded follow-up to the reviewer that found a fixed issue and ask it to verify only the affected changed files plus its prior finding. In Codex, use `followup_task` when available.
2. After all fixes, run one **fresh broad correctness review** of the complete updated target. Always do this for high-risk work; for tiny/normal work, do it when review produced fixes.
3. On Claude Code, use a fresh `codex-review` session for the final gate, falling back explicitly to `dev-correctness-reviewer` when Codex MCP is unavailable.
4. On Codex, use a fresh sub-agent with `$review-agent`.
5. Allow at most **two fresh broad final-gate cycles** after the initial panel; targeted follow-ups do not count toward this ceiling. Stop earlier when a final review has no actionable findings. A result containing only P3/style suggestions ends the loop and is reported as optional. If the second fresh gate still has actionable findings or its fixes would require a third gate, stop and present the residual findings and root-cause concern to the user.

## Report and Continue

Report what was fixed, decisions still needed, root-cause concerns, reviewer participation/fallbacks, and whether the final gate passed. Continue to `dev-sync` unless the user requested review only.

If user feedback exposes a missed recurring issue, offer to add it to the repository standards named under Review Inputs.
