#!/usr/bin/env python3
"""Schema registry validation, formatting, bundling, and compatibility tools.

Usage:
    python3 tools/schema-tools.py validate <dir>       # Validate JSON syntax
    python3 tools/schema-tools.py format <dir>          # Format in place
    python3 tools/schema-tools.py format --check <dir>  # Check formatting only
    python3 tools/schema-tools.py refs <dir>            # Validate $ref targets
    python3 tools/schema-tools.py bundle <dir> <out>    # Bundle schemas (inline $ref)
    python3 tools/schema-tools.py compat <dir>          # Check backward compatibility between versions
    python3 tools/schema-tools.py examples <dir>        # Validate example payloads against schemas
    python3 tools/schema-tools.py all <dir>             # Run validate + format --check + refs + compat
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
                # Strip $id and $schema from inlined refs to avoid duplicate identifiers
                merged = {k: v for k, v in resolved.items() if k not in ("$id", "$schema")}
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
# Compatibility checking — detect breaking changes between versions
# ---------------------------------------------------------------------------

def parse_version(v: str) -> tuple[int, int, int]:
    """Parse 'v1.2.3' into (1, 2, 3)."""
    parts = v.lstrip("v").split(".")
    return (int(parts[0]), int(parts[1]), int(parts[2]))


def collect_properties(schema: dict, prefix: str = "") -> dict[str, dict]:
    """Flatten schema properties into a dict keyed by dotted path."""
    result = {}
    props = schema.get("properties", {})
    for name, prop in props.items():
        path = f"{prefix}.{name}" if prefix else name
        result[path] = prop
        # Recurse into nested objects
        if "properties" in prop:
            result.update(collect_properties(prop, path))
        # Recurse into array items
        if prop.get("type") == "array" and isinstance(prop.get("items"), dict):
            items = prop["items"]
            if "properties" in items:
                result.update(collect_properties(items, f"{path}[]"))
    return result


def check_compat_pair(
    old_schema: dict, new_schema: dict, old_ver: str, new_ver: str, path_label: str
) -> list[str]:
    """Compare two schema versions and return a list of breaking changes."""
    breaking: list[str] = []

    old_props = collect_properties(old_schema)
    new_props = collect_properties(new_schema)
    old_required = set(old_schema.get("required", []))
    new_required = set(new_schema.get("required", []))

    # Removed fields
    for field in old_props:
        if field not in new_props:
            breaking.append(f"  REMOVED: {field} (was in {old_ver}, missing in {new_ver})")

    # Type changes
    for field in old_props:
        if field in new_props:
            old_type = old_props[field].get("type")
            new_type = new_props[field].get("type")
            if old_type != new_type:
                breaking.append(
                    f"  TYPE CHANGED: {field} ({old_type} -> {new_type})"
                )
            # Enum values removed
            old_enum = set()
            new_enum = set()
            if old_props[field].get("oneOf"):
                old_enum = {
                    str(v.get("const", ""))
                    for v in old_props[field]["oneOf"]
                    if "const" in v
                }
            if new_props[field].get("oneOf"):
                new_enum = {
                    str(v.get("const", ""))
                    for v in new_props[field]["oneOf"]
                    if "const" in v
                }
            if old_enum and new_enum:
                removed_vals = old_enum - new_enum
                if removed_vals:
                    breaking.append(
                        f"  ENUM VALUE REMOVED: {field} (removed: {', '.join(sorted(removed_vals))})"
                    )

    # New required fields (that didn't exist or weren't required before)
    added_required = new_required - old_required
    for field in added_required:
        if field not in old_props:
            breaking.append(
                f"  NEW REQUIRED FIELD: {field} (added as required in {new_ver})"
            )
        else:
            breaking.append(
                f"  MADE REQUIRED: {field} (was optional in {old_ver}, required in {new_ver})"
            )

    return breaking


def check_compatibility(schema_dir: str) -> int:
    """Check backward compatibility between consecutive versions. Returns error count."""
    domains_dir = Path(schema_dir) / "domains"
    if not domains_dir.is_dir():
        print("  No domains/ directory found")
        return 0

    errors = 0

    for domain_dir in sorted(domains_dir.iterdir()):
        if not domain_dir.is_dir():
            continue
        for entity_dir in sorted(domain_dir.iterdir()):
            if not entity_dir.is_dir():
                continue

            # Collect and sort versions
            versions = sorted(
                [d.name for d in entity_dir.iterdir() if d.is_dir() and d.name.startswith("v")],
                key=parse_version,
            )

            if len(versions) < 2:
                continue

            entity_name = entity_dir.name
            domain_name = domain_dir.name

            # Compare consecutive versions
            for i in range(1, len(versions)):
                old_ver = versions[i - 1]
                new_ver = versions[i]

                old_major = parse_version(old_ver)[0]
                new_major = parse_version(new_ver)[0]

                # Major version bump — breaking changes are expected
                if new_major > old_major:
                    continue

                old_path = entity_dir / old_ver / f"{entity_name}.schema.json"
                new_path = entity_dir / new_ver / f"{entity_name}.schema.json"

                if not old_path.exists() or not new_path.exists():
                    continue

                try:
                    old_schema = json.loads(old_path.read_text(encoding="utf-8"))
                    new_schema = json.loads(new_path.read_text(encoding="utf-8"))
                except (json.JSONDecodeError, OSError):
                    continue

                label = f"{domain_name}/{entity_name}"
                breaking = check_compat_pair(old_schema, new_schema, old_ver, new_ver, label)

                if breaking:
                    print(f"  FAIL: {label} ({old_ver} -> {new_ver}) has breaking changes in a minor/patch bump:")
                    for b in breaking:
                        print(b)
                    errors += len(breaking)

    return errors


# ---------------------------------------------------------------------------
# Example payload validation
# ---------------------------------------------------------------------------

def validate_examples(schema_dir: str) -> int:
    """Validate example payloads against their referenced schemas. Returns error count."""
    examples_dir = Path(schema_dir).parent / "examples"
    if not examples_dir.is_dir():
        print("  No examples/ directory found")
        return 0

    errors = 0
    domains_dir = Path(schema_dir) / "domains"

    for example_file in sorted(examples_dir.rglob("*.json")):
        try:
            example = json.loads(example_file.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            print(f"  FAIL: {example_file} — {e}")
            errors += 1
            continue

        # Extract dataschema from CloudEvents envelope
        dataschema = example.get("dataschema", "")
        data = example.get("data")

        if not dataschema:
            print(f"  SKIP: {example_file} — no dataschema field")
            continue

        if data is None:
            print(f"  SKIP: {example_file} — no data field")
            continue

        # Resolve dataschema URL to a local file
        # Expected format: https://gluendo.github.io/schema-registry/schemas/domains/{domain}/{entity}/{version}/{entity}.schema.json
        # We extract the path after /schemas/ and look it up in the schemas dir
        schema_path = None
        if "/schemas/domains/" in dataschema:
            rel = dataschema.split("/schemas/domains/")[1]
            schema_path = domains_dir / rel
        elif "/schemas/_common/" in dataschema:
            rel = dataschema.split("/schemas/")[1]
            schema_path = Path(schema_dir) / rel

        if not schema_path or not schema_path.exists():
            print(f"  FAIL: {example_file} — dataschema not found locally: {dataschema}")
            errors += 1
            continue

        try:
            schema = json.loads(schema_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as e:
            print(f"  FAIL: {example_file} — cannot read schema: {e}")
            errors += 1
            continue

        # Basic structural validation (check required fields are present)
        required_fields = schema.get("required", [])
        schema_props = schema.get("properties", {})

        for field in required_fields:
            if field not in data:
                print(f"  FAIL: {example_file} — missing required field: {field}")
                errors += 1

        # Check data field types match schema
        for field, value in data.items():
            if field not in schema_props:
                continue  # extra fields are allowed
            expected = schema_props[field]
            expected_type = expected.get("type")
            if not expected_type:
                continue  # complex type (oneOf, $ref, etc.)

            actual_type = type(value).__name__
            type_map = {
                "str": "string",
                "int": "number",
                "float": "number",
                "bool": "boolean",
                "list": "array",
                "dict": "object",
                "NoneType": "null",
            }
            actual_json_type = type_map.get(actual_type, actual_type)

            if isinstance(expected_type, list):
                if actual_json_type not in expected_type:
                    print(f"  FAIL: {example_file} — field '{field}' is {actual_json_type}, expected {expected_type}")
                    errors += 1
            elif isinstance(expected_type, str):
                if actual_json_type != expected_type:
                    # number also accepts integer
                    if not (expected_type == "number" and actual_json_type in ("number", "integer")):
                        if not (expected_type == "integer" and isinstance(value, int)):
                            print(f"  FAIL: {example_file} — field '{field}' is {actual_json_type}, expected {expected_type}")
                            errors += 1

        print(f"  OK: {example_file}")

    return errors


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

    elif command == "compat":
        print("==> Checking backward compatibility between versions")
        errors = check_compatibility(dir_arg)
        if errors:
            print(f"==> {errors} breaking change(s) found in minor/patch bumps")
            sys.exit(1)
        print("==> All version transitions are backward-compatible")

    elif command == "examples":
        print("==> Validating example payloads")
        errors = validate_examples(dir_arg)
        if errors:
            print(f"==> {errors} example validation error(s)")
            sys.exit(1)
        print("==> All examples are valid")

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
        print("==> All $ref targets resolve\n")

        print("==> Checking backward compatibility between versions")
        errors = check_compatibility(dir_arg)
        if errors:
            print(f"==> {errors} breaking change(s) found in minor/patch bumps")
            sys.exit(1)
        print("==> All version transitions are backward-compatible")

    else:
        print(f"Unknown command: {command}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
