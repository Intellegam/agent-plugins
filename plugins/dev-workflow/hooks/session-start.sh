#!/bin/bash
# SessionStart context injection: the dev workflow itself, so every session
# follows it without each repo carrying the prose in CLAUDE.md.
# No matcher in hooks.json → fires on startup, resume, clear, AND compact,
# so the workflow re-injects after compaction.
# Shares its content with subagent-start.sh (single source: dev-workflow.md).
cat > /dev/null  # drain stdin
cat "$(dirname "$0")/dev-workflow.md"
