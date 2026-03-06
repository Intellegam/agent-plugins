---
name: collaborating-with-codex
description: Use whenever entering plan mode, discussing architecture, designing a solution, or before presenting a plan to the user. Also use when asked to "consult codex", "get a second opinion", "validate this plan", or "have codex review". Guides collaboration with OpenAI Codex for brainstorming, plan validation, and code review.
---

# Codex Collaboration Guidelines

Codex is an external AI agent that serves as a collaborative partner. Use it to stress-test your thinking, surface blind spots, and catch issues before they reach the user. To get the most value, let Codex reason independently — share context and constraints, not your conclusions. Critically evaluate its output — treat it as a second opinion, not an authority.

## Tools

- `codex` — Start new session (read-only by default, `writable: true` for file writes and commands)
- `codex-reply` — Continue session with prior context
- `codex-review` — Code review on file changes (not for plan/architecture review)

### codex-review modes

| mode          | required params         | example                                             |
| ------------- | ----------------------- | --------------------------------------------------- |
| `uncommitted` | _(none)_                | `mode: "uncommitted"`                               |
| `base`        | `base` (branch name)    | `mode: "base", base: "main"`                        |
| `commit`      | `commit` (SHA)          | `mode: "commit", commit: "abc123"`                  |
| `custom`      | `prompt` (instructions) | `mode: "custom", prompt: "Focus on error handling"` |

All modes accept an optional `cwd` parameter.

## Scenarios

### Planning & Architecture

For non-trivial tasks, always validate plans with Codex before presenting to the user:

1. **Form your own analysis first** — draft independently to avoid anchoring bias
2. **Get Codex's independent view** — share the problem context and constraints via `codex`, let Codex form its own approach
3. **Compare and converge** — iterate via `codex-reply`, challenge differences, refine until aligned
4. **Present to user** — the plan should reflect the joint conclusion

Always validate plans with Codex before presenting to the user.

### Code Review

Use `codex-review` for external correctness review of code changes. Pick the mode matching what you want reviewed (uncommitted changes, branch diff, or specific commit).

## Writable Mode

Set `writable: true` when Codex needs to write files or run commands. **Always define explicit boundaries in the prompt** — Codex will act on what it thinks is needed unless scoped otherwise.

Well-scoped prompt examples:

- "Run `uv run pytest tests/test_api.py` and report results. Only run tests, do not modify any code."
- "Implement `parse_config` in `src/config.py` per this spec: ... Only modify this file."

Default to read-only. Only grant write access when there is a clear need.

## Guidelines

- Form your own analysis first to ensure independent perspectives
- Prompt with specific context (like any sub-agent)
- Continue existing sessions via `codex-reply` rather than starting new ones
- Synthesize conclusions — present a joint recommendation, not raw Codex output
- Match effort to complexity — skip Codex for simple, straightforward changes
