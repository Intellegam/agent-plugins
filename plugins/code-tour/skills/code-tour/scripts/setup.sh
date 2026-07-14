#!/usr/bin/env bash
# Thin entry point for scaffolding a code-tour workspace. Delegates to the tour-viewer
# setup script, which does the real work (see tools/tour-viewer/scripts/setup.ts).
#
#   skills/code-tour/scripts/setup.sh <targetDir> [--diff PATH | --base REF --head REF] [--no-install]
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
viewer_setup="$script_dir/../../../tools/tour-viewer/scripts/setup.ts"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun is required (https://bun.sh)" >&2
  exit 1
fi

exec bun run "$viewer_setup" "$@"
