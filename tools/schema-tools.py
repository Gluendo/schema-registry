#!/usr/bin/env python3
"""Schema registry validation and formatting tools.

Usage:
    python3 tools/schema-tools.py validate <dir>     # Validate JSON syntax
    python3 tools/schema-tools.py format <dir>        # Format in place
    python3 tools/schema-tools.py format --check <dir> # Check formatting only
    python3 tools/schema-tools.py refs <dir>          # Validate $ref targets
    python3 tools/schema-tools.py all <dir>           # Run all checks (no formatting)
"""

import json
import os
import sys
from pathlib import Path


def find_schemas(directory: str) -> list[Path]:
    """Find all .schema.json files in directory."""
    return sorted(Path(directory).rglob("*.schema.json"))


def validate_json(schemas: list[Path]) -> int:
    """Validate that all files are valid JSON. Returns error count."""
    errors = 0
    for path in schemas:
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            print(f"  FAIL: {path} — {e}")
            errors += 1
    return errors


def check_format(schemas: list[Path]) -> int:
    """Check that all files match canonical formatting. Returns error count."""
    errors = 0
    for path in schemas:
        try:
            raw = path.read_text(encoding="utf-8")
            data = json.loads(raw)
            formatted = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
            if raw != formatted:
                print(f"  FAIL: {path} is not properly formatted")
                errors += 1
        except (json.JSONDecodeError, OSError):
            pass  # handled by validate_json
    return errors


def format_files(schemas: list[Path]) -> int:
    """Format all files in place. Returns count of files changed."""
    changed = 0
    for path in schemas:
        try:
            raw = path.read_text(encoding="utf-8")
            data = json.loads(raw)
            formatted = json.dumps(data, indent=2, ensure_ascii=False) + "\n"
            if raw != formatted:
                path.write_text(formatted, encoding="utf-8")
                print(f"  FORMATTED: {path}")
                changed += 1
        except (json.JSONDecodeError, OSError):
            print(f"  SKIP: {path} (not valid JSON)")
    return changed


def find_refs(obj: dict | list, refs: list[str] | None = None) -> list[str]:
    """Recursively extract relative $ref values from a JSON structure."""
    if refs is None:
        refs = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "$ref" and isinstance(v, str) and not v.startswith(("http", "urn:", "#")):
                # Strip fragment pointer if present
                refs.append(v.split("#")[0])
            else:
                find_refs(v, refs)
    elif isinstance(obj, list):
        for item in obj:
            find_refs(item, refs)
    return refs


def validate_refs(schemas: list[Path]) -> int:
    """Validate that all $ref targets resolve to existing files. Returns error count."""
    errors = 0
    for path in schemas:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue

        for ref in find_refs(data):
            if not ref:
                continue
            target = (path.parent / ref).resolve()
            if not target.is_file():
                print(f"  FAIL: {path} -> $ref \"{ref}\" does not resolve")
                errors += 1
    return errors


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    check_only = "--check" in sys.argv
    # Find directory argument (not the command, not --check)
    dir_arg = "schemas"
    for arg in sys.argv[2:]:
        if arg != "--check":
            dir_arg = arg

    if not Path(dir_arg).is_dir():
        print(f"ERROR: {dir_arg} is not a directory")
        sys.exit(1)

    schemas = find_schemas(dir_arg)
    if not schemas:
        print(f"==> No schema files found in {dir_arg}/")
        sys.exit(0)

    print(f"==> Found {len(schemas)} schema file(s) in {dir_arg}/")

    if command == "validate":
        print("==> Validating JSON syntax")
        errors = validate_json(schemas)
        if errors:
            print(f"==> {errors} file(s) with invalid JSON")
            sys.exit(1)
        print("==> All JSON files are valid")

    elif command == "format":
        if check_only:
            print("==> Checking JSON formatting")
            errors = check_format(schemas)
            if errors:
                print(f"==> {errors} file(s) need formatting. Run: python3 tools/schema-tools.py format")
                sys.exit(1)
            print("==> All files are properly formatted")
        else:
            print("==> Formatting JSON files")
            changed = format_files(schemas)
            print(f"==> {changed} file(s) formatted")

    elif command == "refs":
        print("==> Validating $ref targets")
        errors = validate_refs(schemas)
        if errors:
            print(f"==> {errors} broken $ref(s) found")
            sys.exit(1)
        print("==> All $ref targets resolve")

    elif command == "all":
        print("==> Validating JSON syntax")
        errors = validate_json(schemas)
        if errors:
            print(f"==> {errors} file(s) with invalid JSON")
            sys.exit(1)
        print("==> All JSON files are valid\n")

        print("==> Checking JSON formatting")
        errors = check_format(schemas)
        if errors:
            print(f"==> {errors} file(s) need formatting. Run: python3 tools/schema-tools.py format")
            sys.exit(1)
        print("==> All files are properly formatted\n")

        print("==> Validating $ref targets")
        errors = validate_refs(schemas)
        if errors:
            print(f"==> {errors} broken $ref(s) found")
            sys.exit(1)
        print("==> All $ref targets resolve")

    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
