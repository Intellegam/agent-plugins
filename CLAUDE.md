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
│       ├── .claude-plugin/  # Claude Code plugin manifest (optional)
│       │   └── plugin.json #   plugin metadata (version source of truth)
│       ├── .codex-plugin/   # Codex plugin manifest (optional; may coexist)
│       │   └── plugin.json
│       ├── .mcp.json       # MCP server configuration (optional)
│       ├── skills/         # Agent skills (optional)
│       └── hooks/          # Event hooks (optional)
└── README.md
```

`dev-workflow` targets both hosts from one plugin root and carries both
manifests. `codex` and `code-tour` target Claude Code; `claude-code` targets
Codex. Both hosts use an `mcpServers` map in `.mcp.json`. Trust the installed
Codex CLI over online plugin docs when they disagree and validate structural
changes with a local marketplace install.

## Development

- Claude Code plugins: update the manifest and `.claude-plugin/marketplace.json`. Codex plugins: update `.codex-plugin/plugin.json`; Codex marketplace entries are unversioned. Dual-host plugins coordinate both manifests to the same release version.
- MCP servers are separate repos (e.g., `codex-mcp`, `claude-code-mcp`) referenced via GitHub
- The codex and claude-code plugins' `.mcp.json` pin their server to a git tag (`#v{version}`). When releasing a new server version, update the tag pin in `.mcp.json` and bump the plugin version to force a cache refresh
