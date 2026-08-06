# Intellegam Agent Plugins

Internal agent plugins for the Intellegam workspace, shared across Claude Code
and OpenAI Codex where their extension surfaces overlap.

## Marketplace

**Name:** `intellegam-agent-plugins`

## Available Plugins

### codex

OpenAI Codex collaboration MCP server for brainstorming, plan validation, and code review with an external AI agent.

**Includes:**

- MCP server configuration (references `github:Intellegam/codex-mcp`)
- `collaborating-with-codex` skill with collaboration guidelines

### claude-code

The reverse direction: lets OpenAI Codex consult Claude Code as a second-opinion agent for brainstorming, plan validation, and code review. This is a **Codex plugin** (`.codex-plugin/`), not a Claude Code plugin — install it via the Codex marketplace below.

**Includes:**

- MCP server configuration (references `github:Intellegam/claude-code-mcp`, tag-pinned)
- `collaborating-with-claude` skill with collaboration guidelines for the Codex side

### dev-workflow

Cross-host org development workflow for Claude Code and Codex: a setup consultant plus a contract-driven validation chain (checks → review → docs sync → PR follow-through).

**Includes:**

- SessionStart hook — injects the five-phase workflow in Claude Code and Codex and re-fires after compaction
- Claude-only SubagentStart matcher — injects the workflow into implementation-capable `general-purpose`/`claude` agents without affecting reviewers; generic Codex sub-agents are intentionally excluded
- `setup` skill — inspects a repo, recommends checks/reviewers with evidence, configures applicable `AGENTS.md`/`CLAUDE.md`, and generates thin Claude/Codex wrappers for accepted repo-specific reviewers
- `dev-check`, `dev-review`, `dev-sync` skills — cross-host, risk-tiered validation with 1/2–3/5 independent reviews, targeted re-review, and up to two fresh broad final-gate cycles
- `babysit-pr` skill — one shared event-driven PR policy plus non-invokable Claude Code/Codex host adapters; it verifies and automatically replies to clear feedback, watches reviews, comments, mergeability, pushes, and CI, and continues until the PR closes or needs a user decision
- One canonical internal reference per lean, quality, correctness-fallback, and sync reviewer; Claude agents are thin wrappers and Codex sub-agents load the same references

Repos declare commands, situational checks, standards docs, and repo-specific reviewers in applicable `AGENTS.md`/`CLAUDE.md`; run `/dev-workflow:setup` in Claude Code or `$dev-workflow:setup` in Codex to onboard a repo.

### code-tour

Agent-generated visual PR walkthroughs. An agent authors a `tour.tsx` — free JSX for narrative and diagrams — but **never writes code**: every snippet is a reference into a raw `pr.diff`, resolved at build time, so hallucinated diff content is structurally impossible. `bun run build` bundles everything into a single offline `tour.html` that also serves as a line-level review surface.

**Includes:**

- `code-tour` skill — drives the flow: export the diff, scaffold a workspace, author `tour.tsx`, build, publish the tour as a Claude Artifact, and (on request) post the link back to the PR
- `tour-viewer` — the reference components (`Tour`, `Section`, `Diff`, `Annotation`, `Graph`), diff parsing/slicing, the `@pierre/diffs` render + review layer (line/range comments, local persistence, Claude-prompt and `gh api` review export), and the single-file build pipeline

Ask Claude to "create a code tour for PR N", or invoke the `code-tour` skill directly.

## Claude Code installation

Add the marketplace to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "intellegam-agent-plugins": {
      "source": {
        "source": "github",
        "repo": "intellegam/agent-plugins"
      }
    }
  },
  "enabledPlugins": {
    "codex@intellegam-agent-plugins": true,
    "dev-workflow@intellegam-agent-plugins": true,
    "code-tour@intellegam-agent-plugins": true
  }
}
```

## Codex installation

The repo doubles as a Codex plugin marketplace (`.agents/plugins/marketplace.json`). Add it once:

```bash
codex plugin marketplace add Intellegam/agent-plugins
```

Then install `claude-code` and `dev-workflow` from the `/plugins` browser in the Codex CLI. The collaboration skill is `$claude-code:collaborating-with-claude`; workflow entrypoints are `$dev-workflow:setup`, `$dev-workflow:dev-check`, `$dev-workflow:dev-review`, `$dev-workflow:dev-sync`, and `$dev-workflow:babysit-pr`.

Manual fallback without the plugin system: add the MCP server directly to `~/.codex/config.toml` — snippet in the [claude-code-mcp README](https://github.com/Intellegam/claude-code-mcp#installation).

## Versioning

**Claude Code plugins** — bump the version in both places and keep them in sync:

1. `plugins/<name>/.claude-plugin/plugin.json` - source of truth
2. `.claude-plugin/marketplace.json` - for discovery/updates

**Codex plugins** — only `plugins/<name>/.codex-plugin/plugin.json` carries a version; `.agents/plugins/marketplace.json` entries are unversioned.

**Dual-host plugins** — keep `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and the Claude marketplace entry on the same release version.

Use semantic versioning (MAJOR.MINOR.PATCH). Plugin versions are their own release stream — a skill or config change still requires a plugin version bump, independent of the referenced MCP server's version.

## Documentation

- [Create plugins](https://code.claude.com/docs/en/plugins.md)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces.md)
