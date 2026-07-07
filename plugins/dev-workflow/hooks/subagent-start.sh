#!/bin/bash
# SubagentStart pointer for implementation-capable agents (matched by type
# in hooks.json). Deliberately a pointer, not a second workflow spec — the
# full workflow is injected into the main session by session-start.sh.
cat > /dev/null  # drain stdin
cat <<'EOF'
<dev-workflow-subagent>
The dev workflow is active. If your delegated task includes code changes, read the repo's CLAUDE.md and its contract block (`dev-workflow-contract` markers). Before returning, run or report the contract's relevant Required Checks, and mention any skipped validation with reasons. Read-only review or exploration tasks should not modify files or run broad checks unless asked.
</dev-workflow-subagent>
EOF
