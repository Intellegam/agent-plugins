---
name: collaborating-with-claude
description: How to consult Claude Code as a second-opinion agent via the claude-agent MCP tools (claude, claude-reply, claude-result, claude-cancel). Use before brainstorming with Claude (aliases @claude, @claude-code), validating a plan, requesting an external code review, or any claude-agent tool call. Form your own analysis first and treat disagreement as signal. Consultations are read-only by default and run as the operator's own Claude Code; always pass cwd (repo root).
---

# Claude Code Collaboration Guidelines

Claude Code is an external AI agent that serves as a collaborative partner. Use
it to stress-test your thinking, surface blind spots, and catch issues before
they reach the user. You remain the primary agent and own the task; Claude
supplies an independent critique, not task ownership. Critically evaluate its
output — treat it as a second opinion, not an authority.

Claude runs as the *operator's own* Claude Code: it loads their user and
project configuration, plugins, skills, and MCP servers, and reads the repo you
point it at. It does **not** see your conversation, your instructions, or your
tool results — pass the task constraints and evidence explicitly in the prompt.

## Tools

- `claude` — Start a new session; returns after initialization (read-only by default, `writable: true` for file writes and commands)
- `claude-reply` — Continue the same stable session; returns after the reply initializes (pass `cwd` when resuming after an MCP restart — it must match the session's original `cwd`)
- `claude-result` — Get the latest turn status/result immediately
- `claude-cancel` — Cancel the active turn on a session

Always pass `cwd` (repo root) on `claude` so Claude loads the right project's
configuration and memory.

### Session lifecycle

`claude` and `claude-reply` wait for Claude's initialization handshake (normally
about 0.3–3 seconds, with a 30-second safety bound), then return the same stable
native `sessionId` while the answer continues in the background. A startup
failure or handshake timeout returns a tool error instead of a false session
handle. Poll results while doing useful local work, collect the terminal result
before synthesizing, and cancel sessions you no longer need.

```text
claude({ prompt: "Complex analysis...", cwd: "/repo" })
→ { sessionId: "019a...", status: "running", done: false }

claude-result({ sessionId: "019a..." })
→ { sessionId: "019a...", status: "succeeded", output: "...", done: true }
```

The same `sessionId` is used with `claude-reply`, `claude-result`, and
`claude-cancel`; there is no separate task or turn identifier.

Terminal snapshots also report context usage, the effective auto-compaction
state, observed compact boundaries, and a process-local `cacheLikelyCold`
heuristic. When a completed session is over 150k context tokens and that flag is
true, prefer a fresh session with a short handoff unless the next turn needs the
prior evidence in detail.

Multiple independent sessions can run in parallel — useful when separate
perspectives (e.g. a correctness pass and a security pass) improve coverage.

## Code review

There is no dedicated review tool. Ask for reviews through `claude` with a
structured prompt — and remember that read-only Claude has **no shell**, so it
cannot run `git diff` itself. Either paste the diff into the prompt, or name
the exact files and the comparison context; Claude can read files in the repo
but not compare revisions. Do not enable `writable` merely so Claude can run
git commands.

Ask for structured findings: ordered by severity, with file/line evidence, and
claims labeled verified vs. inferred. Example:

```
<task>Review this diff for correctness issues. Diff:
[paste git diff output]
</task>
<output_contract>Findings ordered by severity with file:line evidence.
Label each claim verified (you read the code) or inferred. No fixes unless asked.</output_contract>
<grounding_rules>Only cite code paths you can trace in the repo. </grounding_rules>
```

After receiving findings, evaluate each one critically — Claude can be wrong
too. Verify claims against the code before acting.

## Prompting Claude

- **Open-ended exploration** — keep prompts broad when you want Claude to surface things you didn't think to ask about.
- **Scoped tasks** — state the concrete job, what "done" looks like, and constraints. Use XML blocks (`<task>`, `<output_contract>`, `<grounding_rules>`, `<verification>`) when the prompt has multiple concerns.
- **Avoid anchoring**: share context and constraints, not your conclusions. Let Claude form its own view first; compare afterwards.
- Don't mix unrelated tasks in one session — split them.

## Read-only vs. writable

Sessions are read-only by default: Claude's built-in mutation tools (file
writes, shell, subagents) are blocked. Two caveats:

- Read-only blocks *built-in* mutations, **not** the operator's non-bridge MCP
  tools — those stay available and may have side effects. Agent-bridge MCP
  servers are unavailable to prevent nested agent sessions. When it matters,
  prohibit external actions explicitly in the prompt.
- `writable` is set at session creation (`claude`, not `claude-reply`) and
  held in memory — a session resumed after an MCP server restart is read-only
  again regardless of how it started.

Keep Claude read-only while you are editing files yourself; two agents
mutating the same tree concurrently is asking for conflicts. Grant
`writable: true` only for a clear need, and always bound it in the prompt:
which files may change, which commands may run.

Well-scoped writable prompts:

- "Run `npm test` and report results. Only run tests, do not modify any code."
- "Implement `parseConfig` in `src/config.js` per this spec: ... Only modify this file."

## Guidelines

- Form your own analysis first, then consult — independent perspectives are the point
- Treat disagreement as signal: when Claude's view conflicts with yours, resolve it with evidence, not seniority
- Start a fresh session at meaningful task or topic boundaries; use
  `claude-reply` only for tightly related follow-ups that benefit from exact
  conversational continuity
- Synthesize conclusions — present a joint recommendation, not raw Claude output
- Match effort to complexity — skip the consult for trivial changes
