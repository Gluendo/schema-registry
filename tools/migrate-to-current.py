#!/usr/bin/env python3
"""Migrate schema registry to add 'current' files at entity level.

For each entity under schemas/domains/{domain}/{entity}/, this script:
1. Finds the latest semver version directory
2. Copies {entity}.schema.json to the entity level with $ref paths adjusted
3. Copies the policies/ directory (if present) to the entity level
"""

import json
import re
import shutil
import sys
from pathlib import Path


def parse_semver(name: str) -> tuple[int, ...] | None:
    """Parse a directory name like 'v1.2.3' into a comparable tuple."""
    m = re.match(r"^v(\d+)\.(\d+)\.(\d+)$", name)
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    return None


def find_latest_version(entity_dir: Path) -> Path | None:
    """Return the path of the highest semver directory inside entity_dir."""
    versions = []
    for child in entity_dir.iterdir():
        if child.is_dir():
            sv = parse_semver(child.name)
            if sv is not None:
                versions.append((sv, child))
    if not versions:
        return None
    versions.sort(key=lambda x: x[0])
    return versions[-1][1]


def adjust_refs(obj):
    """Recursively walk JSON and strip leading '../' from $ref values."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "$ref" and isinstance(value, str) and value.startswith("../"):
                obj[key] = value[3:]  # remove first '../'
            else:
                adjust_refs(value)
    elif isinstance(obj, list):
        for item in obj:
            adjust_refs(item)


def migrate_entity(entity_dir: Path, entity_name: str) -> None:
    latest = find_latest_version(entity_dir)
    if latest is None:
        return

    print(f"  {entity_dir.relative_to(root)}: latest = {latest.name}")

    # --- Copy and adjust schema file ---
    schema_src = latest / f"{entity_name}.schema.json"
    schema_dst = entity_dir / f"{entity_name}.schema.json"

    if schema_src.exists():
        with open(schema_src, "r", encoding="utf-8") as f:
            data = json.load(f)
        adjust_refs(data)
        with open(schema_dst, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write("\n")
        print(f"    copied {schema_src.name} -> {schema_dst.relative_to(root)}")
    else:
        print(f"    WARNING: {schema_src} not found, skipping schema copy")

    # --- Copy policies directory ---
    policies_src = latest / "policies"
    policies_dst = entity_dir / "policies"

    if policies_src.is_dir():
        if policies_dst.exists():
            shutil.rmtree(policies_dst)
        shutil.copytree(policies_src, policies_dst)
        count = sum(1 for _ in policies_dst.rglob("*") if _.is_file())
        print(f"    copied policies/ ({count} file(s)) -> {policies_dst.relative_to(root)}")
    else:
        print(f"    no policies/ in {latest.name}, skipping")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    domains_dir = root / "schemas" / "domains"

    if not domains_dir.is_dir():
        print(f"ERROR: {domains_dir} does not exist", file=sys.stderr)
        sys.exit(1)

    print(f"Scanning {domains_dir} ...\n")

    for domain_dir in sorted(domains_dir.iterdir()):
        if not domain_dir.is_dir():
            continue
        print(f"Domain: {domain_dir.name}")
        for entity_dir in sorted(domain_dir.iterdir()):
            if not entity_dir.is_dir():
                continue
            migrate_entity(entity_dir, entity_dir.name)
        print()

    print("Done.")
