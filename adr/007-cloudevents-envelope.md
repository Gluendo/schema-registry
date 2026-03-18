# ADR-007: CloudEvents as the envelope standard

## Status

Accepted

## Date

2026-03-18

## Context

Canonical messages need a consistent envelope — a standard way to carry metadata (who produced this, what type of event, which schema version, when it happened) alongside the payload. Without a shared envelope format, every producer invents its own metadata structure, making routing, filtering, observability, and tooling fragile and inconsistent.

### Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **Custom envelope per project** | Tailored to exact needs | No ecosystem, reinvents the wheel, inconsistent across clients |
| **AsyncAPI message headers** | Spec-driven, documentation-friendly | Envelope format varies per binding (Kafka, AMQP, HTTP) |
| **CloudEvents** | CNCF standard, transport-agnostic, wide ecosystem, extensible | Opinionated (some fields mandatory), requires adoption buy-in |

## Decision

We adopt **[CloudEvents](https://cloudevents.io/) (v1.0)** as the standard envelope for all messages on the integration platform.

CloudEvents provides:

- A **transport-agnostic metadata structure** with required fields (`specversion`, `id`, `source`, `type`, `time`) and optional fields (`datacontenttype`, `dataschema`, `subject`).
- A **custom extensions mechanism** for platform-specific or domain-specific metadata.
- **Protocol bindings** for Kafka, HTTP, AMQP, NATS, and others — the same envelope works regardless of transport.
- A **wide ecosystem**: SDKs in Java, Go, Python, JavaScript, C#, and more.

### Mandatory attributes

The platform requires the following attributes on **every message**. This is a superset of the CloudEvents spec requirements — some attributes that are optional in the spec are mandatory on this platform:

| Attribute | CloudEvents spec | Platform | Description |
|-----------|-----------------|----------|-------------|
| `specversion` | Required | **Mandatory** | CloudEvents spec version (`"1.0"`) |
| `id` | Required | **Mandatory** | Unique event identifier (UUID recommended) |
| `source` | Required | **Mandatory** | URN identifying the producing system (see source convention below) |
| `type` | Required | **Mandatory** | Reverse-DNS event type (see type convention below) |
| `time` | Optional | **Mandatory** | ISO 8601 timestamp of when the event occurred |
| `datacontenttype` | Optional | **Mandatory** | MIME type of the `data` field (always `"application/json"` on this platform) |
| `dataschema` | Optional | **Mandatory** | Resolvable URL to the JSON Schema for the `data` field (see below) |
| `traceparent` | Extension | **Mandatory** | W3C Trace Context for distributed tracing (see below) |

Producers that omit any mandatory attribute must be rejected at publish time (see ADR-010).

### Separation of concerns: envelope vs. payload

CloudEvents defines the **envelope** (metadata). The schema registry defines the **payload** (the `data` field). These are independent:

- The envelope is governed by the CloudEvents spec and platform-wide conventions.
- The payload is governed by the domain-specific JSON Schema in the registry (see ADR-002).
- The `dataschema` attribute in the CloudEvents envelope is the **bridge** between the two — it points to the JSON Schema that describes the `data` field.

### The `dataschema` attribute

The `dataschema` field tells consumers which schema to validate `data` against. This is where the schema registry becomes concrete at runtime:

```json
{
  "specversion": "1.0",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "source": "urn:gluendo:system:hr:workday",
  "type": "gluendo.hr.employee.created",
  "time": "2026-03-18T10:30:00Z",
  "datacontenttype": "application/json",
  "traceparent": "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
  "dataschema": "https://schemas.gluendo.io/domains/hr/employee/v1.0.0/employee.schema.json",
  "data": {
    "employeeId": "EMP-12345",
    "firstName": "Alice",
    "lastName": "Martin",
    "department": "Engineering"
  }
}
```

The `dataschema` value must be a **resolvable URL** (not a URN), since consumers and validation tooling need to fetch the schema. This aligns with the schema registry serving layer: published schemas are available at stable, immutable URLs.

The JSON Schema `$id` (which uses a URN, see ADR-004) remains the canonical identifier for the schema. The `dataschema` URL is the locator. The mapping between the two is maintained by the serving layer.

### The `type` attribute

The `type` field follows a reverse-DNS-style convention that mirrors the schema registry structure:

```
{org}.{domain}.{entity}.{event}
```

Examples:
- `gluendo.hr.employee.created`
- `gluendo.finance.invoice.submitted`
- `gluendo.supply-chain.purchase-order.approved`

For client deployments, the organization prefix changes:

- `client-x.hr.employee.created`

This convention enables:
- **Routing and filtering** based on type prefix (e.g., all `*.hr.*` events go to the HR data lake).
- **Schema lookup** by deriving the registry path from the type.
- **Consistency** between event types and schema folder structure.

### The `source` attribute

The `source` attribute identifies **which system produced the event**. It uses a URN following this convention:

```
urn:{org}:{domain}:{product}[:{component}]
```

- `{org}` — the organization (e.g., `gluendo`, or the client's identifier)
- `{domain}` — the business domain (e.g., `hr`, `finance`)
- `{product}` — the specific system or application (e.g., `workday`, `sap`, `custom-crm`)
- `{component}` — optional, for large systems with identifiable subsystems

Examples:
- `urn:gluendo:hr:workday` — Workday producing HR events
- `urn:gluendo:finance:sap` — SAP producing finance events
- `urn:gluendo:finance:sap:accounts-payable` — a specific SAP module

For client deployments:
- `urn:client-x:hr:workday`

The `source` URN should be scoped at the **right granularity**: specific enough to identify the producer for debugging and routing, but not so granular that every microservice instance gets a unique source. Scope at the product or component level, not at the instance level.

### Channel / topic naming convention

Channels (topics, queues) follow a structured naming convention that incorporates audience segmentation (ADR-009):

**For events:**
```
{domain}.{audience}.{entity}.{action}
```

Examples:
- `hr.internal.employee.created`
- `hr.partner.employee.created`
- `finance.internal.invoice.submitted`

**For commands** (future — see open questions):
```
{domain}.{audience}.{action}-{entity}
```

Example:
- `crm.partner.update-customer`

This convention enables:
- **Audience isolation**: different topics per audience, with projection policies (ADR-009) applied before delivery.
- **Subscription filtering**: consumers subscribe to the topics matching their audience and domain.
- **Consistency**: topic names are derivable from the CloudEvents `type` attribute + audience context.

### Distributed tracing: `traceparent`

The `traceparent` attribute is **mandatory** on all messages. It follows the [W3C Trace Context](https://www.w3.org/TR/trace-context/) specification and is defined by the CloudEvents [distributed tracing extension](https://github.com/cloudevents/spec/blob/main/cloudevents/extensions/distributed-tracing.md).

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

This enables:

- **End-to-end traceability**: a single business transaction (e.g., employee onboarding) can be traced across all events it produces, even across multiple systems and transports.
- **OpenTelemetry integration**: the `traceparent` value maps directly to OpenTelemetry spans, following the [semantic conventions for CloudEvents](https://opentelemetry.io/docs/specs/semconv/cloudevents/cloudevents-spans/). No custom instrumentation needed.
- **Observability correlation**: logs, metrics, and traces can be correlated with the events that triggered them.

Producers must propagate the trace context from the incoming request (if any) or create a new trace root. The platform's observability stack (tracing backend, dashboards) must be configured to ingest and visualize CloudEvents spans.

### Platform-wide custom extensions

CloudEvents supports custom extension attributes for metadata that goes beyond the core spec. The platform defines the following standard extensions:

| Extension | Mandatory | Purpose | Example |
|-----------|-----------|---------|---------|
| `traceparent` | **Yes** | W3C Trace Context for distributed tracing | `"00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"` |
| `correlationid` | Recommended | Trace a business transaction across multiple events | `"corr-7890-abcd"` |
| `causationid` | Recommended | Identify the event that caused this event | `"evt-1234-5678"` |

Domain-specific extensions (e.g., change tracking, ETags) are defined per use case and documented alongside the relevant schemas. See ADR-008 for event pattern-specific extensions.

## Consequences

### Positive

- **Standardized metadata**: every message on the platform has a consistent, predictable envelope regardless of producer or transport.
- **Schema registry integration**: the `dataschema` attribute creates a direct, machine-readable link between a message and its schema.
- **Ecosystem leverage**: SDKs, middleware, and tooling (logging, tracing, dead-letter handling) can operate on CloudEvents generically.
- **Transport portability**: the same message structure works across Kafka, HTTP, AMQP — producers don't need to know the transport.
- **Extensibility**: custom extensions allow platform-specific metadata without breaking the standard.
- **Built-in observability**: mandatory `traceparent` ensures every message is traceable end-to-end via OpenTelemetry, out of the box.

### Negative

- **Adoption overhead**: teams must learn the CloudEvents spec and use the appropriate SDK.
- **Envelope size**: CloudEvents metadata adds bytes to every message. For high-throughput scenarios, this overhead should be measured.
- **Extension discipline**: without governance, custom extensions can proliferate and become inconsistent. Platform-wide extensions must be reviewed centrally.

### Risks

- Teams may embed metadata in the `data` payload instead of using CloudEvents attributes. CI linting and schema review should catch this.
- The `dataschema` URL must resolve reliably. If the schema serving layer is unavailable, consumers that validate at runtime will be affected. Consider caching or vendoring schemas locally for resilience.
