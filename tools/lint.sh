#!/usr/bin/env bash
# Lint bundled (self-contained) schemas using Vacuum with custom ruleset
# Expects bundled schemas in dist/ (produced by schema-tools.py bundle)
# Requires: vacuum (brew install daveshanley/vacuum/vacuum)
set -euo pipefail

SCHEMA_DIR="${1:-dist}"
RULESET="${2:-ruleset.yaml}"

if ! command -v vacuum &> /dev/null; then
  echo "ERROR: vacuum is not installed."
  echo "Install: brew install daveshanley/vacuum/vacuum"
  echo "    or: npm i -g @quobix/vacuum"
  exit 1
fi

echo "==> Linting schemas in ${SCHEMA_DIR}/ with ruleset ${RULESET}"

files=()
while IFS= read -r -d '' f; do
  files+=("$f")
done < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ ${#files[@]} -eq 0 ]; then
  echo "==> No schema files found"
  exit 0
fi

vacuum lint -k -r "$RULESET" --no-style --fail-severity error "${files[@]}"
echo "==> All schemas pass linting"
