#!/usr/bin/env bash
# Bootstrap a new client schema registry from the Gluendo starter kit.
#
# Usage:
#   ./setup.sh <client-name> <target-dir>
#
# Example:
#   ./setup.sh acme-corp ../acme-schema-registry
#
# This script:
# 1. Copies the client template to the target directory
# 2. Copies common types, enums, and tooling from the starter kit
# 3. Replaces {{CLIENT_NAME}} placeholders
# 4. Initializes a git repo

set -euo pipefail

CLIENT_NAME="${1:?Usage: ./setup.sh <client-name> <target-dir>}"
TARGET_DIR="${2:?Usage: ./setup.sh <client-name> <target-dir>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
STARTER_KIT="$(dirname "$SCRIPT_DIR")"

if [ -d "$TARGET_DIR" ]; then
  echo "ERROR: $TARGET_DIR already exists"
  exit 1
fi

echo "==> Creating client schema registry for ${CLIENT_NAME} at ${TARGET_DIR}"

# Copy template
cp -r "$SCRIPT_DIR" "$TARGET_DIR"
rm -f "$TARGET_DIR/setup.sh"

# Copy common types and enums from starter kit
cp -r "$STARTER_KIT/schemas/_common/types/"* "$TARGET_DIR/schemas/_common/types/"
cp -r "$STARTER_KIT/schemas/_common/enums/"* "$TARGET_DIR/schemas/_common/enums/"

# Copy tooling
cp "$STARTER_KIT/tools/schema-tools.py" "$TARGET_DIR/tools/"
cp "$STARTER_KIT/tools/lint.sh" "$TARGET_DIR/tools/"
chmod +x "$TARGET_DIR/tools/lint.sh"

# Copy supporting files
cp "$STARTER_KIT/ruleset.yaml" "$TARGET_DIR/"
cp "$STARTER_KIT/CONTRIBUTING.md" "$TARGET_DIR/"
cp "$STARTER_KIT/Makefile" "$TARGET_DIR/"
cp "$STARTER_KIT/templates/entity.schema.json" "$TARGET_DIR/templates/"
cp "$STARTER_KIT/.github/pull_request_template.md" "$TARGET_DIR/.github/"
cp "$STARTER_KIT/.gitignore" "$TARGET_DIR/"

# Replace placeholders
find "$TARGET_DIR" -type f \( -name "*.md" -o -name "*.json" -o -name "*.yaml" \) \
  -exec sed -i '' "s/{{CLIENT_NAME}}/${CLIENT_NAME}/g" {} +

# Replace gluendo URNs with client URNs in common types
find "$TARGET_DIR/schemas" -type f -name "*.json" \
  -exec sed -i '' "s/urn:gluendo:schema/urn:${CLIENT_NAME}:schema/g" {} +

# Init git
cd "$TARGET_DIR"
git init
git add .
git commit -m "Initialize schema registry for ${CLIENT_NAME}

Bootstrapped from Gluendo Schema Registry starter kit."

echo ""
echo "==> Done! Client schema registry created at ${TARGET_DIR}"
echo "==> Next steps:"
echo "    cd ${TARGET_DIR}"
echo "    # Add your first domain schema"
echo "    mkdir -p schemas/domains/{domain}/{entity}/v1.0.0"
echo "    cp templates/entity.schema.json schemas/domains/{domain}/{entity}/v1.0.0/{entity}.schema.json"
