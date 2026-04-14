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
    "codex@intellegam-claude-plugins": true
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
