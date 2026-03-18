# ADR-008: Event patterns and their relationship to schemas

## Status

Accepted

## Date

2026-03-18

## Context

Not all events carry the same amount of information. Martin Fowler's [article on event-driven patterns](https://martinfowler.com/articles/201701-event-driven.html) identifies distinct patterns that serve different purposes. The integration platform must support these patterns and the schema registry must account for how each pattern relates to schema definitions.

### The three event patterns

| Pattern | What it carries | Use case |
|---------|----------------|----------|
| **Fat event** (Event-Carried State Transfer — full) | Complete entity state | Consumer can operate autonomously without calling back the producer |
| **Delta event** (Event-Carried State Transfer — changes only) | Changed fields + entity identifier | Consumer knows what changed, can apply partial updates |
| **Skinny event** (Event Notification) | Entity identifier + optional change hints | Consumer is notified something happened, must call back for details |

Each pattern has different trade-offs:

| Concern | Fat | Delta | Skinny |
|---------|-----|-------|--------|
| **Payload size** | Large | Medium | Small |
| **Consumer autonomy** | High (no callback needed) | Medium | Low (must call back) |
| **Producer coupling** | Low | Low | Higher (consumer depends on producer API) |
| **Consistency risk** | Low (full snapshot) | Medium (partial state) | Low (source of truth stays with producer) |

## Decision

The platform supports all three event patterns. The choice of pattern is a **producer decision** (see ADR-003) based on their domain needs, consumer requirements, and throughput constraints.

### One schema per entity, not per pattern

A key design decision: the schema registry defines **one schema per entity**, not one per event pattern. The same schema is referenced by fat, delta, and skinny events alike.

This works because:

- The schema defines the **full shape of the entity** — all possible fields, their types, descriptions, and constraints.
- Only the **entity identifier** (and possibly a few core invariants) is marked as `required`.
- A fat event populates all fields. A delta event populates the identifier + changed fields. A skinny event populates only the identifier.
- All three are **valid against the same schema**, because non-required fields are optional by definition.

The **event pattern is communicated through CloudEvents metadata** (the `type` attribute and extensions like `changedfields`), not through distinct schemas. The schema is "what this entity looks like." The envelope is "what happened to it and how much information is included."

#### Example: employee entity

Schema (`employee.schema.json`):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:gluendo:schema:hr:employee:v1.0.0",
  "title": "Employee",
  "description": "Canonical representation of an employee entity",
  "type": "object",
  "required": ["employeeId"],
  "properties": {
    "employeeId": {
      "type": "string",
      "description": "Unique employee identifier"
    },
    "firstName": {
      "type": "string"
    },
    "lastName": {
      "type": "string"
    },
    "department": {
      "type": "string"
    },
    "position": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "hireDate": {
      "type": "string",
      "format": "date"
    }
  }
}
```

Fat event (all fields populated):

```json
{
  "specversion": "1.0",
  "type": "gluendo.hr.employee.created",
  "dataschema": "https://schemas.gluendo.io/domains/hr/employee/v1.0.0/employee.schema.json",
  "data": {
    "employeeId": "EMP-12345",
    "firstName": "Alice",
    "lastName": "Martin",
    "department": "Engineering",
    "position": "Staff Engineer",
    "email": "alice.martin@example.com",
    "hireDate": "2026-03-01"
  }
}
```

Delta event (identifier + changed fields):

```json
{
  "specversion": "1.0",
  "type": "gluendo.hr.employee.updated",
  "dataschema": "https://schemas.gluendo.io/domains/hr/employee/v1.0.0/employee.schema.json",
  "changedfields": ["position", "department"],
  "etag": "\"7a3f9c12\"",
  "data": {
    "employeeId": "EMP-12345",
    "position": "Principal Engineer",
    "department": "Platform"
  }
}
```

Skinny event (identifier only):

```json
{
  "specversion": "1.0",
  "type": "gluendo.hr.employee.updated",
  "dataschema": "https://schemas.gluendo.io/domains/hr/employee/v1.0.0/employee.schema.json",
  "changedfields": ["position", "department"],
  "etag": "\"7a3f9c12\"",
  "data": {
    "employeeId": "EMP-12345"
  }
}
```

All three payloads validate against the same schema.

### Impact on repository structure

Since there is one schema per entity (not per event), the folder structure from ADR-006 simplifies:

```
schemas/domains/hr/employee/
  v1.0.0/
    employee.schema.json        # single schema for the entity
  v1.1.0/
    employee.schema.json        # new version with added optional fields
```

The event lifecycle (`created`, `updated`, `terminated`) is expressed in the CloudEvents `type` attribute, not in the schema file name.

### Shared change tracking extensions

The following CloudEvents extension attributes are standardized across the platform for delta and skinny events:

| Extension attribute | Type | Description |
|---------------------|------|-------------|
| `changedfields` | `array of string` | JSON Path notation for fields that changed (e.g., `["premium.amount", "status"]`) |
| `etag` | `string` | Entity tag per [RFC 7232](https://datatracker.ietf.org/doc/html/rfc7232#section-2.3), enables ordering and optimistic concurrency |

These extensions are defined as reusable schemas in the `_common/` folder of the schema registry and documented in the starter kit.

### Guidance for choosing a pattern

| Choose this pattern... | When... |
|----------------------|---------|
| **Fat** | Consumers need autonomy (no callback), payload size is acceptable, eventual consistency via snapshots is the goal |
| **Delta** | Payload size matters, consumers can handle partial updates, change tracking is valuable |
| **Skinny** | Producers want minimal coupling to consumer needs, consumers have access to a query API, real-time notification is the primary goal |

A producer may use multiple patterns for the same entity (e.g., fat for `created`, delta for `updated`). The `type` attribute makes it unambiguous which pattern and lifecycle event a given message represents.

## Consequences

### Positive

- **One schema, one entity**: no schema proliferation per event pattern. The registry stays lean.
- **Simplicity**: producers and consumers reason about "the employee schema," not "the employee-created schema vs. the employee-updated schema."
- **Flexibility**: producers choose the pattern that fits their domain without affecting the schema definition.
- **Validation works everywhere**: fat, delta, and skinny payloads all validate against the same schema because only the identifier is required.
- **Reusable extensions**: change tracking (`changedfields`, `etag`) is standardized, not reinvented per domain.

### Negative

- **Schema doesn't enforce completeness for fat events**: since only the identifier is `required`, a fat event could technically omit fields and still pass validation. This is a trade-off: strictness per pattern would require multiple schemas.
- **Producer decision burden**: choosing the right pattern requires understanding consumer needs. The guidance table helps, but domain-specific judgement is still required.
- **Extension governance**: custom extensions beyond `changedfields` and `etag` must be reviewed to prevent proliferation.

### Mitigations

- For fat events where completeness matters, producers can document (and CI can optionally enforce) that `created` events must populate all fields. This is a producer-level policy, not a schema-level constraint.
- The platform team provides clear guidance and examples for each pattern in the contribution guide.

### Resolved questions

- **Should the `type` attribute convention encode the pattern?** (e.g., `gluendo.hr.employee.updated.notification` for skinny) — **No.** The `type` stays as `{org}.{domain}.{entity}.{event}`. The event pattern is signalled by the presence/absence of extensions (`changedfields`, `etag`) and the completeness of `data`. Encoding the pattern in `type` would fragment routing and contradict the one-schema-per-entity principle.

### Open questions

- **Should `changedfields` be mandatory for delta/skinny events?** Currently recommended but not enforced. This could be tightened based on experience.
