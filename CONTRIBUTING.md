# Contributing to the Schema Registry

This guide explains how to add, modify, and version schemas in the registry.

## Who can contribute?

**Producer teams** own their domain schemas (see [ADR-003](adr/003-producer-ownership.md)). If you produce data for a domain, you are responsible for defining and maintaining its schemas.

The **platform team** maintains common types (`schemas/_common/`) and reviews all PRs for standards compliance.

## Adding a new entity schema

### 1. Copy the template

```bash
# Create the folder structure
mkdir -p schemas/domains/{domain}/{entity}/v1.0.0

# Copy and customize the template
cp templates/entity.schema.json schemas/domains/{domain}/{entity}/v1.0.0/{entity}.schema.json
```

### 2. Fill in the schema

Replace the `{{placeholders}}` in the template:

- `$id`: `urn:gluendo:schema:{domain}:{entity}:v1.0.0`
- `title`: human-readable entity name
- `description`: what this entity represents and who produces it
- `required`: only the entity identifier (and any true invariants)
- `properties`: all fields the entity can carry

Remember:
- **One schema per entity** — event lifecycle (created, updated, etc.) is expressed in CloudEvents `type`, not in schema files ([ADR-008](adr/008-event-patterns.md)).
- **Only require the identifier** — fat, delta, and skinny events must all validate against the same schema.
- **Use `$ref`** for common types (address, monetary amount, etc.) from `schemas/_common/types/`.
- **Use `oneOf` with `const`** for enums, not bare `enum` arrays ([ADR-004](adr/004-versioning-and-compatibility.md#enum-evolution)).

### 3. Add audience policies (if applicable)

If the entity has multiple audiences, add projection policies:

```bash
mkdir -p schemas/domains/{domain}/{entity}/v1.0.0/policies
```

See [ADR-009](adr/009-audience-segmentation.md) for the policy-as-code approach.

### 4. Open a pull request

- Branch from `main`
- Add your schema files
- Ensure CI passes (linting, validation)
- Request review from the platform team and your domain's code owners

## Modifying an existing schema

### Backward-compatible changes (minor version)

Adding a new **optional** field, updating descriptions, or adding examples:

```bash
# Create the new version folder
cp -r schemas/domains/{domain}/{entity}/v1.0.0 schemas/domains/{domain}/{entity}/v1.1.0

# Edit the new version
# Update $id to match: urn:gluendo:schema:{domain}:{entity}:v1.1.0
```

### Breaking changes (major version)

Removing a field, changing a type, or making an optional field required:

```bash
# Create the new major version
cp -r schemas/domains/{domain}/{entity}/v1.1.0 schemas/domains/{domain}/{entity}/v2.0.0

# Edit the new version
# Update $id to match: urn:gluendo:schema:{domain}:{entity}:v2.0.0
```

Breaking changes require:
- A migration plan documented in the PR description
- A deprecation timeline for the previous major version
- Approval from the platform team

See [ADR-004](adr/004-versioning-and-compatibility.md) for full versioning rules.

## Naming conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Domain folder | `kebab-case` | `supply-chain` |
| Entity folder | `kebab-case` | `purchase-order` |
| Version folder | `vMAJOR.MINOR.PATCH` | `v1.2.0` |
| Schema file | `{entity}.schema.json` | `purchase-order.schema.json` |
| Common type file | `{type-name}.schema.json` | `monetary-amount.schema.json` |
| Property names | `camelCase` | `employeeId`, `hireDate` |

## Required schema metadata

Every schema must include:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:gluendo:schema:{domain}:{entity}:{version}",
  "title": "Human-readable title",
  "description": "What this entity represents and who produces it"
}
```

## Common types and enums

Reusable types are in `schemas/_common/types/` and enums in `schemas/_common/enums/`. Reference them with `$ref` (path is relative to the schema file location):

```json
{
  "homeAddress": {
    "$ref": "../../../../_common/types/address.schema.json"
  }
}
```

**Types** (`schemas/_common/types/`):
- `address.schema.json` — postal address (refs country-code-alpha2 enum)
- `monetary-amount.schema.json` — amount + currency (refs currency-code enum)
- `contact-info.schema.json` — email + phone (E.164)
- `uuid.schema.json` — UUID (RFC 4122)
- `etag.schema.json` — HTTP entity tag (RFC 7232)
- `error.schema.json` — problem details (RFC 9457)
- `tags.schema.json` — key-value metadata tags
- `traceparent.schema.json` — W3C Trace Context traceparent
- `tracestate.schema.json` — W3C Trace Context tracestate

**Enums** (`schemas/_common/enums/`):
- `country-code-alpha2.schema.json` — ISO 3166-1 alpha-2 country codes
- `currency-code.schema.json` — ISO 4217 currency codes

To propose a new common type or enum, open a PR against `schemas/_common/` and request platform team review.

## Checklist before opening a PR

- [ ] Schema is valid JSON and valid JSON Schema (draft 2020-12)
- [ ] `$id` URN matches the file path (domain, entity, version)
- [ ] `$schema`, `$id`, `title`, and `description` are present
- [ ] Only the entity identifier is in `required`
- [ ] Property names use `camelCase`
- [ ] Enums use `oneOf`/`const` with descriptions
- [ ] `$ref` targets point to existing schemas
- [ ] Version bump is appropriate (patch/minor/major)
- [ ] If breaking change: migration plan documented, major version bumped

## Local setup

Install the pre-commit hook to validate schemas before each commit:

```bash
make hooks
```

This runs `schema-tools.py all` automatically when you commit schema changes. To skip temporarily: `git commit --no-verify`.
