#!/usr/bin/env python3
"""Schema registry validation, formatting, and bundling tools.

Usage:
    python3 tools/schema-tools.py validate <dir>       # Validate JSON syntax
    python3 tools/schema-tools.py format <dir>          # Format in place
    python3 tools/schema-tools.py format --check <dir>  # Check formatting only
    python3 tools/schema-tools.py refs <dir>            # Validate $ref targets
    python3 tools/schema-tools.py bundle <dir> <out>    # Bundle schemas (inline $ref)
    python3 tools/schema-tools.py all <dir>             # Run validate + format --check + refs
"""

import json
import sys
from pathlib import Path


def find_schemas(directory: str) -> list[Path]:
    """Find all .schema.json files in directory."""
    return sorted(Path(directory).rglob("*.schema.json"))


# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Format
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# $ref validation
# ---------------------------------------------------------------------------

def find_refs(obj, refs: list[str] | None = None) -> list[str]:
    """Recursively extract relative $ref values from a JSON structure."""
    if refs is None:
        refs = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "$ref" and isinstance(v, str) and not v.startswith(("http", "urn:", "#")):
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


# ---------------------------------------------------------------------------
# Bundle — inline all $ref into self-contained schemas
# ---------------------------------------------------------------------------

def resolve_ref(ref_path: str, base_dir: Path, resolved_cache: dict) -> dict:
    """Load and recursively resolve a $ref target, with cycle detection."""
    target = (base_dir / ref_path).resolve()
    target_str = str(target)

    if target_str in resolved_cache:
        return resolved_cache[target_str]

    # Placeholder to break cycles
    resolved_cache[target_str] = {"$comment": f"circular-ref: {ref_path}"}

    data = json.loads(target.read_text(encoding="utf-8"))
    resolved = inline_refs(data, target.parent, resolved_cache)
    resolved_cache[target_str] = resolved
    return resolved


def inline_refs(obj, base_dir: Path, resolved_cache: dict):
    """Recursively replace $ref with inlined content."""
    if isinstance(obj, dict):
        if "$ref" in obj:
            ref = obj["$ref"]
            if isinstance(ref, str) and not ref.startswith(("http", "urn:", "#")):
                ref_file = ref.split("#")[0]
                resolved = resolve_ref(ref_file, base_dir, resolved_cache)
                # Merge sibling keywords (e.g., description) with resolved content
                # In JSON Schema 2020-12, siblings of $ref are evaluated
                merged = dict(resolved)
                for k, v in obj.items():
                    if k != "$ref":
                        merged[k] = v
                return merged
        # Regular object — recurse into values
        return {k: inline_refs(v, base_dir, resolved_cache) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [inline_refs(item, base_dir, resolved_cache) for item in obj]
    return obj


def bundle_schemas(source_dir: str, output_dir: str) -> int:
    """Bundle all domain schemas by inlining $ref. Returns count of bundled files."""
    source = Path(source_dir)
    output = Path(output_dir)

    # Only bundle domain schemas (not _common types which are the $ref targets)
    domain_dir = source / "domains"
    if not domain_dir.is_dir():
        print(f"  No domains/ directory found in {source_dir}")
        return 0

    domain_schemas = sorted(domain_dir.rglob("*.schema.json"))
    bundled = 0

    for path in domain_schemas:
        # Preserve relative path under domains/
        rel = path.relative_to(domain_dir)
        out_path = output / "domains" / rel
        out_path.parent.mkdir(parents=True, exist_ok=True)

        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            resolved_cache: dict = {}
            bundled_data = inline_refs(data, path.parent, resolved_cache)
            out_path.write_text(
                json.dumps(bundled_data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            print(f"  BUNDLED: {path} -> {out_path}")
            bundled += 1
        except (json.JSONDecodeError, OSError) as e:
            print(f"  FAIL: {path} — {e}")

    # Also copy _common types as-is (they're already self-contained or leaf refs)
    common_dir = source / "_common"
    if common_dir.is_dir():
        for path in sorted(common_dir.rglob("*.schema.json")):
            rel = path.relative_to(source)
            out_path = output / rel
            out_path.parent.mkdir(parents=True, exist_ok=True)

            data = json.loads(path.read_text(encoding="utf-8"))
            resolved_cache_common: dict = {}
            bundled_data = inline_refs(data, path.parent, resolved_cache_common)
            out_path.write_text(
                json.dumps(bundled_data, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )

    return bundled


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    command = sys.argv[1]
    check_only = "--check" in sys.argv
    # Collect positional args (not the command, not flags)
    positional = [a for a in sys.argv[2:] if not a.startswith("--")]
    dir_arg = positional[0] if positional else "schemas"

    if command == "bundle":
        out_arg = positional[1] if len(positional) > 1 else "dist"
        if not Path(dir_arg).is_dir():
            print(f"ERROR: {dir_arg} is not a directory")
            sys.exit(1)
        print(f"==> Bundling schemas from {dir_arg}/ into {out_arg}/")
        count = bundle_schemas(dir_arg, out_arg)
        print(f"==> {count} schema(s) bundled")
        return

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
