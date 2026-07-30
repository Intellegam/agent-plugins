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

Language-agnostic org dev workflow: a setup consultant plus a contract-driven validation chain (checks → review → docs sync).

**Includes:**

- SessionStart hook — injects the five-phase workflow (explore & plan, implement, validate, commit, babysit) into every session; re-fires after compaction
- SubagentStart hook — injects the same workflow into implementation-capable sub-agents (general-purpose/claude), which apply the phases that fit their delegated scope; special agents (reviewers, dev-coder, Explore) unaffected
- `setup` skill — inspects a repo, recommends checks/reviewers with evidence, and installs the commands & checks sections in CLAUDE.md that parameterize the other skills
- `dev-check`, `dev-review`, `dev-sync` skills — risk-tiered validation chain with bounded review passes and root-cause reflection
- `babysit-pr` skill — event-driven post-PR loop: a one-shot waiter wakes the agent on new reviews, Codex's 👍 all-clear reaction, pushes, or CI changes; findings get verified, fixed or refuted, replied, and resolved until the PR is clean
- `dev-coder` implementation agent + lean (over-engineering), quality (implementation + tests), correctness, and sync reviewer agents

Repos declare their commands, situational checks, standards docs, and repo-specific reviewers in the contract; run `/dev-workflow:setup` to onboard a repo.

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

Then install the `claude-code` plugin from the `/plugins` browser in the Codex CLI. The bundled skill is invoked as `$claude-code:collaborating-with-claude`.

Manual fallback without the plugin system: add the MCP server directly to `~/.codex/config.toml` — snippet in the [claude-code-mcp README](https://github.com/Intellegam/claude-code-mcp#installation).

## Versioning

When updating a plugin, bump the version in both places and keep them in sync:

1. `plugins/<name>/.claude-plugin/plugin.json` (or `.codex-plugin/plugin.json` for Codex plugins) - source of truth
2. `.claude-plugin/marketplace.json` or `.agents/plugins/marketplace.json` - for discovery/updates

Use semantic versioning (MAJOR.MINOR.PATCH). Plugin versions are their own release stream — a skill or config change still requires a plugin version bump, independent of the referenced MCP server's version.

## Documentation

- [Create plugins](https://code.claude.com/docs/en/plugins.md)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces.md)
