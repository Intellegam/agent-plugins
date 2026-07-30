# Agent Plugins

Internal agent plugins for Claude Code and OpenAI Codex in the Intellegam
workspace.

You MUST read the following file for more information:

- @README.md

## Structure

```
agent-plugins/
├── .claude-plugin/
│   └── marketplace.json    # Claude Code marketplace (plugin versions)
├── .agents/
│   └── plugins/
│       └── marketplace.json # Codex marketplace (plugins with .codex-plugin/)
├── plugins/
│   └── <plugin-name>/
│       ├── .claude-plugin/  # Claude Code plugin manifest, OR
│       │   └── plugin.json #   plugin metadata (version source of truth)
│       ├── .codex-plugin/   # Codex plugin manifest (same role)
│       │   └── plugin.json
│       ├── .mcp.json       # MCP server configuration (optional)
│       ├── skills/         # Agent skills (optional)
│       └── hooks/          # Event hooks (optional)
└── README.md
```

A plugin targets one host: `codex`, `dev-workflow`, and `code-tour` are Claude
Code plugins; `claude-code` is a Codex plugin. Note the `.mcp.json` formats
differ — Claude Code uses an `mcpServers` map, Codex uses `mcp_servers` (or a
direct server map).

## Development

- Plugin versions must be updated in both `plugin.json` and the matching marketplace file (Codex marketplace entries carry no version — only `plugin.json` there)
- MCP servers are separate repos (e.g., `codex-mcp`, `claude-code-mcp`) referenced via GitHub
- The codex and claude-code plugins' `.mcp.json` pin their server to a git tag (`#v{version}`). When releasing a new server version, update the tag pin in `.mcp.json` and bump the plugin version to force a cache refresh
