#!/usr/bin/env bash
# Lint all .schema.json files using Vacuum with custom ruleset
# Requires: vacuum (brew install daveshanley/vacuum/vacuum)
set -euo pipefail

SCHEMA_DIR="${1:-schemas}"
RULESET="${2:-ruleset.yaml}"
errors=0

if ! command -v vacuum &> /dev/null; then
  echo "ERROR: vacuum is not installed."
  echo "Install: brew install daveshanley/vacuum/vacuum"
  echo "    or: npm i -g @quobix/vacuum"
  exit 1
fi

echo "==> Linting schemas in ${SCHEMA_DIR}/ with ruleset ${RULESET}"

while IFS= read -r -d '' file; do
  echo "  Linting: ${file}"
  if ! vacuum lint -k -r "$RULESET" --no-style --fail-severity error "$file" 2>&1; then
    errors=$((errors + 1))
  fi
done < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ "$errors" -gt 0 ]; then
  echo "==> ${errors} file(s) with linting errors"
  exit 1
else
  echo "==> All schemas pass linting"
fi
