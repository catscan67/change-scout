#!/usr/bin/env bash
#
# Validates an OpenAPI contract whenever one is edited.
#
# Runs as a PostToolUse hook. Deterministic: it lints and reports, it does not
# reason and it never calls a model.
#
# Three properties this script is responsible for, in order of importance:
#
#   1. It runs only the linter installed in this plugin's own node_modules, at
#      the exact version pinned in package-lock.json. It never fetches anything.
#   2. It forces this plugin's own Redocly configuration. Redocly otherwise
#      discovers redocly.yaml from the working directory, and that file can
#      declare `plugins` — JavaScript modules the linter imports and executes.
#      Without --config, editing an OpenAPI file in a hostile repository would
#      run that repository's own code.
#   3. It reduces network exposure: telemetry and update checks are disabled,
#      and contracts whose own text carries a remote $ref are refused rather
#      than resolved. That last one is a best-effort filter, NOT a boundary —
#      see the note above the check.

set -euo pipefail

# Locate the plugin root from this script's own path, so the binary and config
# are always the trusted local ones — never $PATH, never the working directory.
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
PLUGIN_ROOT=$(dirname -- "$SCRIPT_DIR")
REDOCLY="$PLUGIN_ROOT/node_modules/.bin/redocly"
REDOCLY_CONFIG="$PLUGIN_ROOT/redocly.yaml"

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

# The linter and its trusted configuration must already be present.
if [ ! -x "$REDOCLY" ]; then
  echo "OpenAPI validation skipped: linter not installed." >&2
  echo "Run the one-time setup from the plugin root:" >&2
  echo "  npm ci --ignore-scripts" >&2
  exit 2
fi

if [ ! -f "$REDOCLY_CONFIG" ]; then
  echo "OpenAPI validation skipped: trusted config missing at $REDOCLY_CONFIG" >&2
  exit 2
fi

# Remote references are fetched over the network during linting, so refuse them.
#
# This is a BEST-EFFORT FILTER, not a network boundary. It inspects only the
# edited file's own text. A local $ref chain reaching a file that itself carries
# a remote reference is not caught, and Redocly resolves those recursively.
# Where a hard guarantee is required — anywhere server-side request forgery into
# reachable internal services would matter — run the linter under enforced
# network denial. See "Known limitations" in README.md.
if grep -qE "\\\$ref[\"']?[[:space:]]*:.*https?://" "$FILE"; then
  echo "OpenAPI validation skipped: $FILE contains remote \$ref values." >&2
  echo "This hook does not resolve references over the network." >&2
  exit 2
fi

# REDOCLY_TELEMETRY / REDOCLY_SUPPRESS_UPDATE_NOTICE: no phoning home, no
# version check. --config: our configuration, never the analyzed repository's.
if OUTPUT=$(REDOCLY_TELEMETRY=off REDOCLY_SUPPRESS_UPDATE_NOTICE=true \
            "$REDOCLY" lint --config "$REDOCLY_CONFIG" "$FILE" 2>&1); then
  exit 0
fi

# Exit code 2 hands stderr back to Claude as feedback on the edit it just made.
echo "OpenAPI validation failed: $FILE" >&2
echo "$OUTPUT" >&2
exit 2
