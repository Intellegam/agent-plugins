# Intellegam Claude Plugins

Internal Claude Code plugins for the Intellegam workspace.

## Marketplace

**Name:** `intellegam-claude-plugins`

## Available Plugins

### codex

OpenAI Codex collaboration MCP server for brainstorming, plan validation, and code review with an external AI agent.

**Includes:**

- MCP server configuration (references `github:Intellegam/codex-mcp`)
- `collaborating-with-codex` skill with collaboration guidelines

### dev-workflow

Language-agnostic org dev workflow: a setup consultant plus a contract-driven validation chain (checks → review → docs sync).

**Includes:**

- SessionStart hook — injects the five-phase workflow (explore & plan, implement, validate, commit, triage) into every session; re-fires after compaction
- SubagentStart hook — injects the same workflow into implementation-capable sub-agents (general-purpose/claude), which apply the phases that fit their delegated scope; special agents (reviewers, dev-coder, Explore) unaffected
- `setup` skill — inspects a repo, recommends checks/reviewers with evidence, and installs the commands & checks sections in CLAUDE.md that parameterize the other skills
- `dev-check`, `dev-review`, `dev-sync` skills — risk-tiered validation chain with bounded review passes and root-cause reflection
- `dev-coder` implementation agent + lean (over-engineering), quality (implementation + tests), correctness, and sync reviewer agents

Repos declare their commands, situational checks, standards docs, and repo-specific reviewers in the contract; run `/dev-workflow:setup` to onboard a repo.

### code-tour

Agent-generated visual PR walkthroughs. An agent authors a `tour.tsx` — free JSX for narrative and diagrams — but **never writes code**: every snippet is a reference into a raw `pr.diff`, resolved at build time, so hallucinated diff content is structurally impossible. `bun run build` bundles everything into a single offline `tour.html` that also serves as a line-level review surface.

**Includes:**

- `code-tour` skill — drives the flow: export the diff, scaffold a workspace, author `tour.tsx`, build, and publish the tour as a Claude Artifact
- `tour-viewer` — the reference components (`Tour`, `Section`, `Diff`, `Annotation`, `Graph`), diff parsing/slicing, the `@pierre/diffs` render + review layer (line/range comments, local persistence, Claude-prompt and `gh api` review export), and the single-file build pipeline

Ask Claude to "create a code tour for PR N", or invoke the `code-tour` skill directly.

## Installation

Add the marketplace to your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "intellegam-claude-plugins": {
      "source": {
        "source": "github",
        "repo": "intellegam/claude-plugins"
      }
    }
  },
  "enabledPlugins": {
    "codex@intellegam-claude-plugins": true,
    "dev-workflow@intellegam-claude-plugins": true,
    "code-tour@intellegam-claude-plugins": true
  }
}
```

## Versioning

When updating a plugin, bump the version in both places and keep them in sync:

1. `plugins/<name>/.claude-plugin/plugin.json` - source of truth
2. `.claude-plugin/marketplace.json` - for discovery/updates

Use semantic versioning (MAJOR.MINOR.PATCH).

## Documentation

- [Create plugins](https://code.claude.com/docs/en/plugins.md)
- [Plugins reference](https://code.claude.com/docs/en/plugins-reference.md)
- [Plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces.md)
