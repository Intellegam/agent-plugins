#!/bin/bash
# Injects the dev workflow (dev-workflow.md) into context. Referenced by BOTH
# hook events in hooks.json:
# - SessionStart (no matcher → fires on startup, resume, clear, AND compact,
#   so the workflow re-injects after compaction)
# - SubagentStart (matcher: general-purpose/claude → implementation-capable
#   sub-agents get the same workflow and apply the phases that fit their
#   delegated scope; special agents like reviewers/dev-coder are excluded)
cat > /dev/null  # drain stdin
cat "$(dirname "$0")/dev-workflow.md"
