#!/bin/bash
# SubagentStart context injection for implementation-capable sub-agents
# (general-purpose/claude, matched by type in hooks.json). Injects the same
# workflow as session-start.sh (single source: dev-workflow.md) — the text
# tells sub-agents to apply the phases that fit their delegated scope.
# Special agents (dev-coder, reviewers, Explore) are excluded by the matcher
# and keep their own focused prompts.
cat > /dev/null  # drain stdin
cat "$(dirname "$0")/dev-workflow.md"
