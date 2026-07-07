#!/bin/bash
# SessionStart context injection: condensed agent-behavior guidelines and
# workflow pointers. Full version lives in the agent-behavior skill.
cat > /dev/null  # drain stdin
cat <<'EOF'
Dev workflow (dev-workflow plugin) is active. Core behavior guidelines — read the `dev-workflow:agent-behavior` skill for the full version:
- Think before coding: state assumptions, surface tradeoffs, ask when unclear.
- Simplicity first: minimum code that solves the problem; nothing speculative.
- Surgical changes: touch only what you must; clean up only your own mess.
- Goal-driven: define verifiable success criteria, loop until verified.
Workflow: plan (validate non-trivial plans with an independent perspective, e.g. Codex, when available) → implement → `/dev-workflow:dev-check` → `/dev-workflow:dev-review` → `/dev-workflow:dev-sync` before commit/push. The repo's commands and checks are declared in the contract block (dev-workflow-contract markers) in CLAUDE.md.
EOF
