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

- `setup` skill — inspects a repo, recommends checks/reviewers with evidence, and installs the **Dev Workflow Contract** (a versioned marker block in CLAUDE.md) that parameterizes the other skills
- `dev-check`, `dev-review`, `dev-sync` skills — risk-tiered validation chain with bounded review passes and root-cause reflection
- `dev-coder` implementation agent + quality/test/correctness/sync reviewer agents

Repos declare their commands, situational checks, standards docs, and repo-specific reviewers in the contract; run `/dev-workflow:setup` to onboard a repo.

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
    "dev-workflow@intellegam-claude-plugins": true
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
