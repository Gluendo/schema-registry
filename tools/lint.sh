#!/usr/bin/env bash
# Lint all .schema.json files using Vacuum with custom ruleset
# Requires: vacuum (brew install daveshanley/vacuum/vacuum)
set -euo pipefail

SCHEMA_DIR="${1:-schemas}"
RULESET="${2:-ruleset.yaml}"

if ! command -v vacuum &> /dev/null; then
  echo "ERROR: vacuum is not installed."
  echo "Install: brew install daveshanley/vacuum/vacuum"
  echo "    or: npm i -g @quobix/vacuum"
  exit 1
fi

echo "==> Linting schemas in ${SCHEMA_DIR}/ with ruleset ${RULESET}"

# Collect all schema files and lint in a single vacuum invocation
mapfile -d '' files < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ ${#files[@]} -eq 0 ]; then
  echo "==> No schema files found"
  exit 0
fi

# --ignore-rule: $ref resolution handled by schema-tools.py, vacuum can't resolve deep relative paths
vacuum lint -k -r "$RULESET" --no-style --fail-severity error --ignore-rule resolving-references "${files[@]}"
echo "==> All schemas pass linting"
