# ADR-004: Semantic versioning with backward compatibility enforcement

## Status

Accepted

## Date

2026-03-18

## Context

In an integration platform, schema evolution is inevitable. New fields are added, types are refined, and occasionally breaking changes are necessary. Without clear rules, schema changes can silently break consumers, causing runtime failures in production.

The platform must balance two competing needs:

- **Producer agility**: producers must be able to evolve their schemas without excessive friction.
- **Consumer stability**: consumers must be able to trust that a schema they integrated against will not break without warning.

### Versioning approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **No versioning** (latest only) | Simple | Any change can break consumers |
| **Date-based versioning** | Easy to generate | No semantic meaning, hard to reason about compatibility |
| **Semantic versioning (SemVer)** | Clear compatibility contract, widely understood | Requires discipline to classify changes correctly |
| **Kafka-style compatibility levels** | Fine-grained (BACKWARD, FORWARD, FULL) | Complex, Kafka-specific terminology |

## Decision

We adopt **Semantic Versioning (SemVer)** for all schemas, with **backward compatibility enforced by default**.

### Version semantics for schemas

| Version bump | When | Example |
|-------------|------|---------|
| **Patch** (1.0.x) | Documentation, examples, metadata changes. No structural change. | Adding a `description` to a field |
| **Minor** (1.x.0) | Backward-compatible additions. Existing consumers are unaffected. | Adding a new optional field |
| **Major** (x.0.0) | Breaking changes. Consumers must adapt. | Removing a field, changing a field's type, making an optional field required |

### Compatibility rules

1. **Backward compatibility is the default**: a new minor version must validate all messages that were valid under the previous version.
2. **Breaking changes require a major version bump** and trigger a mandatory migration window.
3. **CI enforces compatibility**: on every PR, the pipeline compares the proposed schema against the previous version and blocks merging if a breaking change is introduced without a major version bump.
4. **Multiple major versions can coexist**: `v1` and `v2` of a schema can both be active during a migration period. The producer documents the deprecation timeline.

### Version encoding

Versions are encoded in the **folder structure**, not in the schema file itself:

```
schemas/domains/hr/employee/
  v1.0.0/
    employee.schema.json
  v1.1.0/
    employee.schema.json            # added optional field
  v2.0.0/
    employee.schema.json            # breaking change
```

This makes versions visible in the file tree, enables Git-based diffing between versions, and avoids coupling version metadata to the schema content.

### Git tags and releases

Each published version is also tagged in Git:

```
hr/employee/v1.0.0
hr/employee/v1.1.0
hr/employee/v2.0.0
```

Consumers can pin to a specific tag for stability.

## Enum evolution

Enumerations deserve special attention because they are a frequent source of subtle breaking changes.

### The problem with enums

Adding a value to an enum is **backward-compatible for producers** (they can now send a new value) but **potentially breaking for consumers** (they may not know how to handle the new value). Conversely, removing an enum value is breaking for producers but safe for consumers that already ignore it.

This asymmetry means enum changes cannot be classified as simply "breaking" or "non-breaking" — it depends on the perspective.

### Rules for enum evolution

| Change | Producer impact | Consumer impact | Classification |
|--------|----------------|-----------------|----------------|
| **Add a value** | Compatible | Potentially breaking (unknown value) | **Minor** — but consumers must be designed to tolerate unknown enum values |
| **Remove a value** | Breaking (can no longer send it) | Compatible | **Major** |
| **Rename a value** | Breaking | Breaking | **Major** |

### Design guidance

1. **Consumers must tolerate unknown enum values**: this is a platform-wide rule. Consumers that receive an enum value they don't recognize must handle it gracefully (log a warning, use a default, skip processing) — never crash or reject the message. This makes enum additions safe as minor version bumps.
2. **Prefer `oneOf` with `const` over `enum` for documented values**: when each value carries specific semantics, use `oneOf` with `const` and `description` for each value. This provides self-documenting schemas and makes the intent of each value explicit.
3. **Consider using a separate reference data schema** for enums that change frequently (e.g., country codes, currency codes). These can be versioned independently from the message schema.
4. **Include a catch-all where appropriate**: for enums that are expected to grow, document this expectation in the schema description so consumers are forewarned.

Example — prefer this:

```json
{
  "status": {
    "oneOf": [
      { "const": "draft", "description": "Initial state, not yet submitted" },
      { "const": "submitted", "description": "Submitted for review" },
      { "const": "approved", "description": "Approved by reviewer" }
    ]
  }
}
```

Over this:

```json
{
  "status": {
    "enum": ["draft", "submitted", "approved"]
  }
}
```

## Schema linting

To maintain consistency and catch errors early, all schemas are validated through automated linting on every PR.

### Linting layers

| Layer | What it checks | Tooling |
|-------|---------------|---------|
| **JSON validity** | File is valid JSON | Any JSON parser |
| **JSON Schema validity** | File is a valid JSON Schema document (correct keywords, valid `$ref` targets) | AJV, hyperjump, or equivalent |
| **Structural conventions** | File follows project naming conventions, required metadata fields are present | Custom rules / Spectral |
| **Compatibility** | Schema is backward-compatible with the previous version (for minor/patch bumps) | Custom diff script or json-schema-diff |

### Required schema metadata

Every schema file must include the following top-level properties:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:gluendo:schema:{domain}:{entity}:{version}",
  "title": "Human-readable title",
  "description": "What this event represents and when it is produced"
}
```

The `$id` uses a **URN (Uniform Resource Name)** rather than a URL. This is intentional:

- **Infrastructure-independent**: the identifier does not depend on any particular hosting domain or endpoint.
- **Stable**: URNs are meant to be permanent identifiers — they won't break if the schema is served from a different location.
- **Unambiguous**: the URN encodes domain, entity, version, and event in a predictable, parseable format.

Example: `urn:gluendo:schema:hr:employee:v1.0.0`

### Linting rules enforced by CI

1. **Valid JSON**: the file must parse without errors.
2. **Valid JSON Schema**: the file must conform to the declared `$schema` draft.
3. **`$id` matches path**: the URN in `$id` must correspond to the schema's file path in the repository (domain, entity, version must match).
4. **Required metadata**: `$schema`, `$id`, `title`, and `description` must be present.
5. **Naming conventions**: file names, property names (camelCase), and folder names (kebab-case) follow the project standard.
6. **No inline enums without documentation**: `enum` keywords should have an accompanying `description`, or be replaced by `oneOf`/`const` (see enum section above).
7. **`$ref` targets resolve**: all `$ref` references point to existing schemas within the repository.
8. **Examples validate**: if example payloads are provided, they must pass validation against the schema.
9. **No `additionalProperties: false` at root** (recommended): for canonical/agnostic messages, forbidding additional properties at the root level hinders extensibility. This rule can be overridden per-schema with justification.

### Linting tooling

The specific linting tool will be chosen during implementation. Candidates include:

- **AJV** (JavaScript): fast, widely used JSON Schema validator — good for validity checks.
- **Spectral** (OpenAPI/JSON linting): rule-based linter with custom rulesets — good for structural conventions.
- **Custom scripts**: for compatibility checks and path-based validation that generic tools don't cover.

The linting pipeline runs as a GitHub Action (or equivalent) and must pass before a PR can be merged.

## Consequences

### Positive

- **Clear contract**: producers and consumers share a common understanding of what a version change means.
- **Automated safety net**: CI catches accidental breaking changes and convention violations before they reach consumers.
- **Enum safety**: explicit rules prevent the most common source of subtle integration breakage.
- **Consistent quality**: linting ensures all schemas meet a baseline quality standard regardless of which team authored them.
- **Coexistence**: major versions can run in parallel, enabling gradual migration.
- **Familiar model**: SemVer is widely understood across the industry.

### Negative

- **Folder duplication**: each version contains the full schema, even if changes are small. This is intentional — each version must be self-contained and independently usable.
- **Discipline required**: producers must correctly classify changes as patch/minor/major. CI catches structural issues but not semantic ones (e.g., changing the meaning of a field without changing its type).
- **Migration coordination**: major version bumps require communication and a migration plan, which takes effort.
- **Linting maintenance**: custom linting rules must be maintained as conventions evolve.

### Open questions

- **Deprecation policy**: how long must a deprecated major version be maintained? This may vary per client and should be configurable.
- **Compatibility check tooling**: the specific tool for automated compatibility checks needs to be evaluated (custom script vs. existing libraries). This will be decided during implementation.
