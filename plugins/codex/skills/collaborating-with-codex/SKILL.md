---
name: collaborating-with-codex
description: Use whenever entering plan mode, discussing architecture, designing a solution, or before presenting a plan to the user. Also use when asked to "consult codex", "get a second opinion", "validate this plan", or "have codex review". Guides collaboration with OpenAI Codex for brainstorming, plan validation, and code review.
---

# Codex Collaboration Guidelines

Codex is an external AI agent that serves as a collaborative partner. Use it to stress-test your thinking, surface blind spots, and catch issues before they reach the user. To get the most value, let Codex reason independently — share context and constraints, not your conclusions. Critically evaluate its output — treat it as a second opinion, not an authority.

## Tools

- `codex` — Start new session (read-only by default, `writable: true` for file writes and commands)
- `codex-reply` — Continue session with prior context (pass `cwd` if resuming across MCP reconnections)
- `codex-review` — Code review on file changes (returns session ID, can be continued with `codex-reply`)
- `codex-result` — Poll for async job status/result (supports `waitMs` for long-polling)
- `codex-cancel` — Cancel a running async job

### Async mode

All three primary tools (`codex`, `codex-reply`, `codex-review`) accept `async: true` to return immediately with a job ID instead of blocking. Use async mode when you have other work to do in parallel — e.g., running tests, editing files, or consulting other tools while Codex thinks. If you would just poll `codex-result` in a loop with nothing else to do, use sync (the default) instead.

```
codex({ prompt: "Complex analysis", async: true })
→ { jobId: "job-1", status: "starting", sessionId: "..." }

codex-result({ jobId: "job-1", waitMs: 30000 })
→ { status: "succeeded", output: "...", done: true }
```

Jobs are connection-scoped — they persist for the lifetime of the MCP process.

### codex-review modes

| mode          | required params         | example                                             |
| ------------- | ----------------------- | --------------------------------------------------- |
| `uncommitted` | _(none)_                | `mode: "uncommitted"`                               |
| `base`        | `base` (branch name)    | `mode: "base", base: "main"`                        |
| `commit`      | `commit` (SHA)          | `mode: "commit", commit: "abc123"`                  |
| `custom`      | `prompt` (instructions) | `mode: "custom", prompt: "Focus on error handling"` |

All modes accept an optional `cwd` parameter. For plan/architecture review, use `codex` instead.

## Prompting Codex

Match the prompt style to the intent:

- **Open-ended exploration** — keep prompts broad. "What do you think of this approach?" or "Review this module and tell me what stands out" is fine when you want Codex to surface things you didn't think to ask about.
- **Scoped tasks** (diagnosis, implementation, specific review) — be specific about the task, what "done" looks like, and constraints. Use XML blocks when the prompt has multiple concerns:

```
<task>Diagnose why POST /api/upload returns 413 for files under the 10MB limit.</task>
<output_contract>Return: root cause, evidence, and a fix recommendation.</output_contract>
<grounding_rules>Only cite code paths you can trace. Mark inferences explicitly.</grounding_rules>
```

**Useful blocks for scoped tasks** (use only what the task needs):

- `<task>` — the concrete job and relevant context
- `<output_contract>` — expected shape and brevity of the response
- `<grounding_rules>` — require evidence-based claims (for reviews, research, diagnosis)
- `<verification>` — require Codex to verify its own answer (for implementation, debugging)

**Anti-patterns to avoid:**

- Mixing multiple unrelated tasks in one prompt — split into separate sessions
- Sharing your conclusions before letting Codex form its own view (anchoring bias)

## Scenarios

### Planning & Architecture

For non-trivial tasks, validate plans with Codex before presenting to the user:

1. **Form your own analysis first** — draft independently to avoid anchoring bias
2. **Get Codex's independent view** — share the problem context and constraints via `codex`, let Codex form its own approach
3. **Compare and converge** — iterate via `codex-reply`, challenge differences, refine until aligned
4. **Present to user** — the plan should reflect the joint conclusion

### Code Review

Use `codex-review` for external correctness review of code changes. Pick the mode matching what you want reviewed (uncommitted changes, branch diff, or specific commit).
After receiving findings, critically evaluate each one — not every finding warrants action and codex could always make a mistake too. Distinguish quick patches from deeper architectural issues and prioritize accordingly.

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
- Use `async: true` only when you have meaningful parallel work to do while Codex runs. Default to sync — polling with nothing else to do is worse than blocking
