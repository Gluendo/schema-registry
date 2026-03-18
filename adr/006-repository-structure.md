# ADR-006: Domain-driven repository structure

## Status

Accepted

## Date

2026-03-18

## Context

The repository structure must support:

- **Producer ownership** (ADR-003): teams must clearly see which schemas they own.
- **Versioning** (ADR-004): multiple versions of a schema must coexist.
- **Reusability** (ADR-005): shared types and reference schemas must be clearly separated from client-specific ones.
- **Discoverability**: developers must be able to find schemas without deep knowledge of the platform.
- **CI enforcement**: automated tools must be able to derive domain, entity, and version from the file path.
- **One schema per entity** (ADR-008): event lifecycle (created, updated, etc.) is expressed in CloudEvents metadata, not in schema files.

## Decision

We adopt a **domain-driven folder structure** where the path encodes domain, entity, and version. Each entity has a **single schema file** (see ADR-008 — event lifecycle is expressed in CloudEvents metadata, not in schema file names):

```
schema-registry/
  adr/                              # Architecture Decision Records
  schemas/
    _common/                        # Shared type definitions
      types/
        address.schema.json
        monetary-amount.schema.json
        iso-country-code.schema.json
        contact-info.schema.json
    domains/
      hr/
        employee/
          v1.0.0/
            employee.schema.json
            policies/
              audiences.rego
              audiences_test.rego
          v1.1.0/
            employee.schema.json
            policies/
              audiences.rego
              audiences_test.rego
        position/
          v1.0.0/
            position.schema.json
      finance/
        invoice/
          v1.0.0/
            invoice.schema.json
        payment/
          v1.0.0/
            payment.schema.json
      supply-chain/
        purchase-order/
          v1.0.0/
            purchase-order.schema.json
  tools/                            # Validation scripts, CI helpers
  templates/                        # Schema templates for new contributions
  CODEOWNERS
  CONTRIBUTING.md
```

### Why the `v` prefix on version folders

Version folders use a `v` prefix (e.g., `v1.0.0` instead of `1.0.0`):

1. **Avoids ambiguity**: a folder named `1.0.0` could be mistaken for a dotted namespace or a numeric identifier. The `v` prefix makes it immediately clear that this is a version.
2. **Consistent with Git tags**: Git tags conventionally use the `v` prefix (`v1.0.0`). Using the same convention in folder names means the tag and folder match exactly, reducing cognitive overhead.
3. **Filesystem sorting**: folders starting with a digit sort before alphabetical folders in some tools, which can be confusing in mixed-content directories. The `v` prefix normalizes sorting behavior.
4. **Grep/glob friendliness**: patterns like `v*` or `v[0-9]*` are unambiguous when searching for version folders, whereas `[0-9]*` could match other numeric-prefixed content.
5. **Industry convention**: SemVer tags, Docker image tags, Go modules, and most package managers use the `v` prefix. It is the expected pattern.

### Naming conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Domain folder | `kebab-case` | `supply-chain` |
| Entity folder | `kebab-case` | `purchase-order` |
| Version folder | `vMAJOR.MINOR.PATCH` | `v1.2.0` |
| Schema file | `{entity}.schema.json` | `employee.schema.json` |
| Common type file | `{type-name}.schema.json` | `monetary-amount.schema.json` |

### Path semantics

The path is parseable and meaningful:

```
schemas/domains/{domain}/{entity}/{version}/{entity}.schema.json
```

This enables:

- **CODEOWNERS rules** per domain: `/schemas/domains/hr/ @hr-team`
- **CI scripts** that extract domain, entity, version from the path for validation and publishing.
- **Topic naming derivation**: the path can map to topic names (e.g., `hr.employee.v1`).
- **URN derivation**: the path maps directly to the `$id` URN (e.g., `urn:gluendo:schema:hr:employee:v1.0.0`).

### Common types

The `_common/` folder (prefixed with underscore to sort first) contains shared type definitions that are referenced via `$ref` from domain schemas. These are owned by the platform team and require platform team review for changes.

Common types follow the same versioning rules but use a flat structure since they are fewer and cross-cutting:

```
schemas/_common/types/address.schema.json
```

If a common type needs breaking changes, a new version is created alongside the old one (e.g., `address-v2.schema.json`) rather than using version folders, to keep `$ref` paths simple.

## Consequences

### Positive

- **Self-documenting**: the folder structure tells you what domains exist, what entities they contain, and what versions are available.
- **Ownership-friendly**: maps directly to CODEOWNERS rules.
- **CI-friendly**: paths are parseable and predictable.
- **Scales naturally**: adding a new domain or entity is just adding folders.
- **Topic derivation**: the path structure can drive topic/queue naming conventions, creating consistency across the platform.

### Negative

- **Duplication across versions**: each version folder contains the full schema. This is a deliberate trade-off for self-containment (see ADR-004).
- **Deep nesting**: paths can get long. This is acceptable given the clarity it provides.
- **Common type versioning**: the flat approach for common types is simpler but less consistent with domain schema versioning. This pragmatic choice avoids deeply nested `$ref` paths.
