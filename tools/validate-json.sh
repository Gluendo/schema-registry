#!/usr/bin/env bash
# Validate that all .schema.json files are valid JSON
set -euo pipefail

SCHEMA_DIR="${1:-schemas}"
errors=0

echo "==> Validating JSON syntax in ${SCHEMA_DIR}/"

while IFS= read -r -d '' file; do
  if ! python3 -c "import json, sys; json.load(open(sys.argv[1]))" "$file" 2>/dev/null; then
    echo "  FAIL: ${file} is not valid JSON"
    errors=$((errors + 1))
  fi
done < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ "$errors" -gt 0 ]; then
  echo "==> ${errors} file(s) with invalid JSON"
  exit 1
else
  echo "==> All JSON files are valid"
fi
