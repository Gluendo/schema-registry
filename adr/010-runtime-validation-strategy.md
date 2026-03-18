# ADR-010: Runtime validation strategy

## Status

Accepted

## Date

2026-03-18

## Context

ADR-004 defines schema validation at **CI time** — linting, compatibility checks, and structural conventions enforced on every PR. But schemas must also be validated at **runtime**, when actual messages flow between producers and consumers.

Without runtime validation:

- Producers can emit messages that don't match their declared schema.
- Consumers can silently process malformed data, leading to corrupted state or silent failures.
- Schema drift between what's declared and what's actually produced goes undetected.

The runtime validation strategy must define **who validates, when, and what happens on failure**.

## Decision

### Validation responsibilities

| Actor | Responsibility | When |
|-------|---------------|------|
| **Producer** | Validate outgoing messages against the declared schema **before publishing** | At publish time |
| **Consumer** | Validate incoming messages against the schema referenced in `dataschema` **upon receipt** | At consume time |
| **Platform** | Provide schema access, enforce message size limits, manage dead-letter channels | Continuously |

### Producer-side validation

Producers **must** validate every message against the schema declared in the `dataschema` attribute before publishing. This is the first and most important line of defense.

Requirements:

1. **Load the schema** from the registry (or a local cache) at startup or on version change.
2. **Validate the `data` payload** against the schema using a JSON Schema validator.
3. **Reject invalid messages** at the producer level — do not publish them. Log the validation error with sufficient context for debugging (entity, version, validation errors).
4. **Fail loudly**: a validation failure at the producer is a bug in the producer's code. It should trigger alerts, not be silently swallowed.

### Consumer-side validation

Consumers **must** validate incoming messages against the schema referenced in the `dataschema` attribute.

Requirements:

1. **Resolve `dataschema`**: fetch the schema from the URL declared in the CloudEvents `dataschema` attribute. Cache aggressively — schemas at a given URL are immutable (ADR-005).
2. **Validate the `data` payload** against the resolved schema.
3. **Handle unknown fields gracefully**: consumers must tolerate fields they don't recognize (no `additionalProperties: false` at consumption). This aligns with the linting rule in ADR-004 that discourages `additionalProperties: false` at root — both producer and consumer sides reinforce forward compatibility when new optional fields are added.
4. **Handle unknown enum values gracefully**: consumers must not crash on unrecognized enum values (ADR-004 enum evolution rules).
5. **Process idempotently**: consumers must handle duplicate messages without side effects. The CloudEvents `id` attribute is the natural **deduplication key** — consumers should track processed event IDs and skip duplicates. At-least-once delivery is the norm in distributed messaging; idempotent processing is the consumer's responsibility.

### Validation outcomes at consumer side

| Outcome | Action |
|---------|--------|
| **Valid** | Process normally |
| **Missing required field** | Reject — route to dead-letter channel |
| **Type mismatch on a field** | Reject — route to dead-letter channel |
| **Unknown `type` (CloudEvents)** | Reject — route to dead-letter channel |
| **Unknown optional field** | Accept — ignore the field |
| **Unknown enum value** | Accept — handle gracefully (log warning, use default, skip) |
| **Duplicate `id`** | Skip — already processed (idempotency) |
| **`dataschema` unresolvable** | Retry with backoff; if persistent, route to dead-letter channel with alert |

### Dead-letter handling

Messages that fail validation are routed to a **dead-letter channel** (DLQ/DLT) with structured metadata:

```json
{
  "originalEvent": { /* the full CloudEvents message */ },
  "error": {
    "type": "VALIDATION_FAILURE",
    "details": [
      {
        "path": "$.data.amount",
        "message": "expected type number, got string",
        "schemaRef": "https://schemas.gluendo.io/domains/finance/invoice/v1.0.0/invoice.schema.json"
      }
    ],
    "consumer": "urn:gluendo:system:finance:sap-connector",
    "timestamp": "2026-03-18T10:30:00Z"
  }
}
```

Dead-letter channels must be:

- **Monitored**: validation error rates should be tracked and alerted on. A spike in validation errors likely indicates a producer bug or a schema mismatch.
- **Reviewable**: operators must be able to inspect dead-lettered messages for diagnosis.
- **Replayable**: once the root cause is fixed, dead-lettered messages should be replayable.

### Message size limits

A hard limit of **500 KB** per message (CloudEvents envelope + data payload) is enforced at the platform level.

Rationale:

- Prevents accidental publication of oversized payloads (e.g., a fat event with an embedded binary blob).
- Aligns with common broker limits (Kafka default is 1 MB, but a lower application limit provides headroom).
- Forces producers to design lean payloads. If an entity exceeds 500 KB, it likely needs to be decomposed or use a reference pattern (publish a reference/URL to the full data, not the data itself).

The size limit is enforced by the platform (broker configuration, gateway validation) and documented in the contribution guide. The specific limit can be adjusted per client deployment.

### Schema caching

Both producers and consumers should **cache schemas locally** rather than fetching from the registry on every message:

- Schemas at a given URL are **immutable** (ADR-005). A cached schema never becomes stale for its version.
- Cache invalidation happens on **version change** — when a producer starts emitting `v1.1.0`, consumers will see a new `dataschema` URL and fetch the new version.
- For resilience, a local cache means validation continues even if the schema serving layer is temporarily unavailable.

Recommended caching strategy:

| Approach | When |
|----------|------|
| **Startup preload** | Load all relevant schemas at application startup |
| **Lazy fetch + cache** | Fetch on first encounter of a new `dataschema` URL, cache indefinitely |
| **Vendored schemas** | Bundle schemas into the consumer's deployment artifact (strongest resilience, weakest freshness) |

### Observability

Runtime validation should emit metrics and structured logs to enable monitoring:

| Metric | Description |
|--------|-------------|
| `schema.validation.success` | Count of successfully validated messages (by domain, entity, version) |
| `schema.validation.failure` | Count of validation failures (by domain, entity, version, error type) |
| `schema.validation.latency` | Time spent on validation per message |
| `schema.resolution.failure` | Count of `dataschema` URL resolution failures |
| `dlq.messages.total` | Count of messages routed to dead-letter channels |

These metrics integrate with the platform's observability stack (see ADR-007 — `traceparent` ensures correlation between events and their validation outcomes).

## Consequences

### Positive

- **Defense in depth**: both producer and consumer validate, catching errors at the earliest possible point.
- **Clear failure handling**: dead-letter channels with structured metadata make diagnosis straightforward.
- **Resilience**: schema caching ensures validation works even during registry outages.
- **Observability**: metrics and structured logs make schema drift and validation failures visible before they cause downstream damage.

### Negative

- **Performance overhead**: JSON Schema validation adds latency per message. For high-throughput scenarios, this must be benchmarked and optimized (e.g., pre-compiled validators, schema caching).
- **Operational complexity**: dead-letter channels, monitoring dashboards, and alerting rules must be set up and maintained.
- **Producer discipline**: producers must integrate schema validation into their publish path. This requires SDK support or clear integration guides.

### Mitigations

- Provide validation libraries/wrappers in the starter kit for common languages (Java, Python, TypeScript, Go) that handle schema loading, caching, and validation with minimal boilerplate.
- Dead-letter channel setup and monitoring dashboards can be templated as part of the platform deployment toolkit.
- Benchmark validation overhead early in the implementation phase to ensure it meets throughput requirements.

### Open questions

- **Validation strictness levels**: should some environments (development, staging) use relaxed validation (warn but don't reject) while production enforces strictly? This could ease development velocity at the cost of consistency.
- **Schema resolution fallback**: if `dataschema` is unreachable and no cached version exists, should the consumer process the message unvalidated (with a warning) or reject it? The safe default is reject, but this may be too strict for some use cases.
