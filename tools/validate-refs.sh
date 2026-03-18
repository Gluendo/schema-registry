#!/usr/bin/env bash
# Validate that all $ref targets in schema files resolve to existing files
set -euo pipefail

SCHEMA_DIR="${1:-schemas}"
errors=0

echo "==> Validating \$ref targets in ${SCHEMA_DIR}/"

while IFS= read -r -d '' file; do
  dir=$(dirname "$file")

  # Extract all $ref values (relative paths only, skip URNs and URLs)
  refs=$(python3 -c "
import json, sys

def find_refs(obj, refs=None):
    if refs is None:
        refs = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == '\$ref' and isinstance(v, str) and not v.startswith(('http', 'urn:', '#')):
                refs.append(v)
            else:
                find_refs(v, refs)
    elif isinstance(obj, list):
        for item in obj:
            find_refs(item, refs)
    return refs

with open(sys.argv[1]) as f:
    data = json.load(f)

for ref in find_refs(data):
    print(ref)
" "$file" 2>/dev/null)

  while IFS= read -r ref; do
    [ -z "$ref" ] && continue
    target="${dir}/${ref}"
    if [ ! -f "$target" ]; then
      echo "  FAIL: ${file} -> \$ref \"${ref}\" does not resolve (expected: ${target})"
      errors=$((errors + 1))
    fi
  done <<< "$refs"
done < <(find "$SCHEMA_DIR" -name '*.schema.json' -print0)

if [ "$errors" -gt 0 ]; then
  echo "==> ${errors} broken \$ref(s) found"
  exit 1
else
  echo "==> All \$ref targets resolve"
fi
