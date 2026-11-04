#!/usr/bin/env bash
# Inject the shared workflow on session start in Claude Code and Codex. Both
# hosts fire SessionStart after compaction. The Claude-specific SubagentStart
# matcher intentionally excludes generic Codex sub-agents.
# Claude Code adds plain stdout to context only for SessionStart, so the
# SubagentStart hook passes `subagent-start` to get additionalContext JSON.
cat > /dev/null  # drain stdin
files=("$(dirname "$0")/../references/sub-agent-model-policy.md" "$(dirname "$0")/dev-workflow.md")
if [ "${1:-}" != subagent-start ]; then
  cat "${files[@]}"
  exit 0
fi
text=$(cat "${files[@]}"; printf x)
text=${text%x}
text=${text//\\/\\\\}
text=${text//\"/\\\"}
text=${text//$'\n'/\\n}
text=${text//$'\r'/\\r}
text=${text//$'\t'/\\t}
printf '{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"%s"}}\n' "$text"
