#!/usr/bin/env bash
# Format all .schema.json files with consistent 2-space indentation
# Use --check to verify formatting without modifying files
set -euo pipefail

SCHEMA_DIR="${1:-schemas}"
CHECK_ONLY="${2:-}"
errors=0

if [ "$CHECK_ONLY" = "--check" ]; then
  echo "==> Checking JSON formatting in ${SCHEMA_DIR}/"
else
  echo "==> Formatting JSON files in ${SCHEMA_DIR}/"
fi

while IFS= read -r -d '' file; do
  formatted=$(python3 -c "
import json, sys
with open(sys.argv[1]) as f:
    data = json.load(f)
print(json.dumps(data, indent=2, ensure_ascii=False))
" "$file" 2>/dev/null)

  if [ $? -ne 0 ]; then
    echo "  SKIP: ${file} (not valid JSON)"
    continue
  fi

  # Ensure trailing newline
  formatted="${formatted}"$'\n'

  current=$(cat "$file")

  if [ "$formatted" != "$current" ]; then
    if [ "$CHECK_ONLY" = "--check" ]; then
      echo "  FAIL: ${file} is not properly formatted"
      errors=$((errors + 1))
    else
      echo "$formatted" > "$file"
      echo "  FORMATTED: ${file}"
    fi
  fi
done < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ "$CHECK_ONLY" = "--check" ] && [ "$errors" -gt 0 ]; then
  echo "==> ${errors} file(s) need formatting. Run: ./tools/format-json.sh"
  exit 1
else
  echo "==> Done"
fi
