# ADR-009: Audience segmentation via projection profiles

## Status

Accepted

## Date

2026-03-18

## Context

Integration platforms often serve multiple audiences with different trust levels and data access needs. For example:

- **Internal consumers** (within the organization) may access all fields, including sensitive data (salary, SSN, internal identifiers).
- **Partner consumers** (external but trusted) may only see a subset of fields relevant to the business relationship.
- **Public consumers** (if applicable) may see only non-sensitive, anonymized data.

This segmentation is critical for data governance, regulatory compliance (GDPR, HIPAA, etc.), and reducing unnecessary data exposure.

### The problem

The schema registry defines one canonical schema per entity (ADR-008). But different audiences should not necessarily see the same fields. We need a mechanism to control field visibility per audience without abandoning the one-schema-per-entity principle.

### Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **Channel-level only** (ACLs on topics, same payload) | Simplest, one schema | Cannot hide sensitive fields — all-or-nothing access |
| **Audience-specific schemas** (separate schema files per audience) | Explicit contracts per audience | Schema proliferation, contradicts one-schema-per-entity, sync burden |
| **Custom projection format** (bespoke include/exclude JSON files) | Simple to read | Reinvents the wheel, limited expressiveness, yet another syntax to learn |
| **Policy-as-code** (standard policy language applied to canonical schemas) | Leverages existing ecosystems, expressive, auditable, testable | Requires policy engine at runtime, learning curve |

## Decision

We adopt a **policy-as-code approach** for audience-based field projection, using a standard policy language rather than inventing a custom format.

### Principles

1. **The canonical schema is the single source of truth** for the entity's full shape (ADR-008). It is audience-unaware.
2. **Field visibility per audience is a policy concern**, expressed in a standard policy language alongside the schema.
3. **The policy language must be an established standard** — we do not invent a custom syntax for field projection.

### Recommended policy engines

| Engine | Language | Strengths | Considerations |
|--------|----------|-----------|----------------|
| **[OPA](https://www.openpolicyagent.org/) (Open Policy Agent)** | Rego | CNCF graduated, large ecosystem, JSON-native, widely adopted for authorization and data filtering | Rego has a learning curve; OPA must run as a sidecar or library |
| **[Cedar](https://www.cedarpolicy.com/)** | Cedar | AWS-backed, purpose-built for authorization, formal verification, readable syntax | Newer, smaller ecosystem |
| **[OpenFGA](https://openfga.dev/)** | DSL | Relationship-based access control, good for org structures | More suited to relationship-based authZ than field-level filtering |

OPA/Rego is the most mature and widely adopted choice for JSON data filtering. Cedar is a strong alternative if the client already uses AWS authorization services. The specific engine is a **deployment decision per client** — the starter kit provides guidance and examples for OPA/Rego as the default recommendation, with the architecture being engine-agnostic.

### Repository structure

Policies live alongside the schemas they apply to:

```
schemas/domains/hr/employee/
  v1.0.0/
    employee.schema.json              # canonical schema (full entity)
    policies/
      audiences.rego                  # audience projection rules
      audiences_test.rego             # policy tests
```

### Example: OPA/Rego audience policy

```rego
package gluendo.audiences.hr.employee

import rego.v1

# Define sensitive fields per audience
sensitive_fields := {
    "partner": {"ssn", "salary", "homeAddress", "emergencyContact"},
    "public": {"ssn", "salary", "homeAddress", "emergencyContact", "email", "hireDate"},
}

# Default: internal audience sees everything
default audience := "internal"

# Derive audience from request context
audience := input.audience

# Compute the projected payload
projected_data := result if {
    audience == "internal"
    result := input.data
}

projected_data := result if {
    excluded := sensitive_fields[audience]
    result := {k: v | some k, v in input.data; not k in excluded}
}

# Validation: reject if audience is unknown
deny contains msg if {
    not audience in {"internal", "partner", "public"}
    msg := sprintf("unknown audience: %s", [audience])
}
```

### Key properties of this approach

- **Testable**: Rego policies have a native testing framework. Policy tests live alongside the policy and run in CI.
- **Auditable**: policies are version-controlled, reviewed via PR, and tied to a specific schema version.
- **Expressive**: a real policy language can handle complex rules (e.g., "partners in the EU see different fields than partners in the US", conditional masking, field transformation).
- **Reusable**: common policy patterns (e.g., "exclude PII") can be defined as shared libraries in `_common/policies/` and imported across domains.
- **Decoupled from the schema**: the schema defines data shape; the policy defines access shape. They evolve independently.

### Audience and channel naming

Audience is embedded in the channel/topic naming convention (see ADR-007 for the full specification):

```
{domain}.{audience}.{entity}.{action}
```

The same event may be published to multiple audience channels. The platform applies the audience policy and routes to the appropriate channel with the projected payload.

### Runtime enforcement

The policy engine runs as part of the message delivery pipeline:

- **Gateway / sidecar pattern**: OPA runs alongside the message broker or gateway, evaluating the audience policy before delivering to consumers.
- **Producer-side projection**: the producer queries the policy engine and publishes pre-filtered payloads to audience-specific topics.
- **Consumer-side validation**: the consumer can also evaluate the policy to verify they received the expected projection.

The enforcement architecture is a platform deployment decision. The schema registry provides the policies; the platform applies them.

### Versioning

Policies are versioned alongside the schema they belong to. When a schema version changes (e.g., `v1.0.0` → `v1.1.0`), the policies in the new version folder are updated to reflect the new field set.

CI validates that:
- Policy files parse and compile without errors.
- Policy tests pass.
- Fields referenced in policies exist in the canonical schema.
- At least one audience policy exists per entity (even if it grants full access).

## Consequences

### Positive

- **No custom syntax**: leverages established policy languages with existing tooling, documentation, and community.
- **One schema per entity preserved**: the canonical schema is not fragmented per audience.
- **Testable and auditable**: policies are code — they have tests, reviews, and version history.
- **Expressive**: complex projection rules (conditional, role-based, geography-based) are possible without extending a custom format.
- **Ecosystem leverage**: OPA integrates with Kubernetes, Envoy, Kafka (via plugins), API gateways, and most cloud platforms.

### Negative

- **Learning curve**: teams must learn Rego (or the chosen policy language) in addition to JSON Schema.
- **Runtime dependency**: a policy engine must be available at runtime for enforcement.
- **Overhead for simple cases**: if an entity only needs "internal = all, partner = minus PII", a full policy language may feel heavy. However, starting with a standard avoids the trap of outgrowing a simple custom format later.

### Mitigations

- Provide policy templates in the starter kit for common patterns (full access, PII exclusion, field allowlist).
- The platform team maintains shared policy libraries in `_common/policies/` for reusable rules.
- For clients that find OPA too heavy, the architecture is engine-agnostic — a simpler engine can be substituted as long as it can express field-level projection.

### Open questions

- **Field-level metadata in the schema**: should the canonical schema annotate sensitive fields (e.g., via a custom `x-sensitivity` keyword like `"x-sensitivity": "pii"`)? This would allow policies to reference sensitivity levels rather than field names, making them more resilient to schema changes. Trade-off: it couples metadata to the schema.
- **Default audience**: should there be a platform-wide default for entities that don't define policies? (e.g., default to `internal` only, requiring explicit opt-in for broader access)
- **Policy engine selection**: the starter kit recommends OPA/Rego. The final choice should be validated per client based on their existing infrastructure and team familiarity.
