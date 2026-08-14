#!/usr/bin/env bash
#
# Validates an OpenAPI contract whenever one is edited.
#
# Runs as a PostToolUse hook. Deterministic: it lints and reports, it does not
# reason and it never calls a model.
#
# This script makes NO network calls and installs nothing. It runs only the
# linter already installed in the plugin's own node_modules, at the exact
# version pinned in package-lock.json. If that binary is absent it fails with
# setup instructions rather than fetching anything.

set -euo pipefail

# Locate the plugin root from this script's own path, so the binary we run is
# always the pinned local one — never a global install, never $PATH.
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
PLUGIN_ROOT=$(dirname -- "$SCRIPT_DIR")
REDOCLY="$PLUGIN_ROOT/node_modules/.bin/redocly"

# Claude Code sends the tool call as JSON on stdin. Node is a prerequisite of
# this plugin, so we use it to read the edited file's path.
FILE=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try { console.log(JSON.parse(s).tool_input?.file_path || "") } catch { console.log("") }
})')

# Only OpenAPI contracts are our business. Anything else: do nothing, succeed.
case "$FILE" in
  */openapi/*.yaml | */openapi/*.yml) ;;
  *) exit 0 ;;
esac

# The linter must already be installed. We never acquire it here.
if [ ! -x "$REDOCLY" ]; then
  echo "OpenAPI validation skipped: linter not installed." >&2
  echo "Run the one-time setup from the plugin root:" >&2
  echo "  npm ci --ignore-scripts" >&2
  exit 2
fi

if OUTPUT=$("$REDOCLY" lint "$FILE" 2>&1); then
  exit 0
fi

# Exit code 2 hands stderr back to Claude as feedback on the edit it just made.
echo "OpenAPI validation failed: $FILE" >&2
echo "$OUTPUT" >&2
exit 2
