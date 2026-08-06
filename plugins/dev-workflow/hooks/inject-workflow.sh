#!/usr/bin/env bash
# Inject the shared workflow on session start in Claude Code and Codex. Both
# hosts fire SessionStart after compaction. The Claude-specific SubagentStart
# matcher intentionally excludes generic Codex sub-agents.
cat > /dev/null  # drain stdin
cat "$(dirname "$0")/dev-workflow.md"
