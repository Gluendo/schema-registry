# Schema-Driven Event Validation Demo

End-to-end demo showing schema validation over NATS JetStream. A Python producer emits CloudEvents messages, and consumers in TypeScript and Java independently validate them against schemas fetched from the [catalog](https://gluendo.github.io/schema-registry/).

## Architecture

```
┌──────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│  Producer        │     │  NATS JetStream      │     │  Consumer (TS)       │
│  (Python)        │────►│                      │────►│  AJV validation      │
│                  │     │  Stream: HR_EVENTS   │     │                      │
│  Validates data  │     │                      │     └──────────┬───────────┘
│  before publish  │     │  Subjects:           │                │
└──────────────────┘     │  • employee.created  │     ┌──────────┴───────────┐
                         │  • employee.dlq      │◄────│  DLQ on failure      │
                         │                      │     └──────────────────────┘
                         │                      │
                         │                      │     ┌──────────────────────┐
                         │                      │────►│  Consumer (Java)     │
                         │                      │     │  networknt validator │
                         └─────────────────────┘     │                      │
                                                      └──────────┬───────────┘
                                                                 │
                                                      ┌──────────┴───────────┐
                                                      │  DLQ on failure      │
                                                      └──────────────────────┘
```

## Prerequisites

- Docker with Docker Compose

That's it. Everything runs in containers — no local Python, Node.js, or Java install needed.

## Quick start

### 1. Start NATS

```bash
make up
```

### 2. Build images (first time only)

```bash
make build
```

### 3. Start consumers (in a terminal)

```bash
make consumers
```

Or individually:

```bash
make consume-ts    # TypeScript consumer only
make consume-java  # Java consumer only
```

### 4. Produce a valid event (in another terminal)

```bash
make produce
```

Both consumers will log:

```
--- Received event abc123... ---
  Type:   gluendo.hr.employee.created
  Source: urn:gluendo:hr:workday
  Schema: https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json
  Status: VALID
  Employee: EMP-A1B2C — Alice Martin (Engineering)
```

### 5. Produce an invalid event

```bash
make produce-invalid
```

Both consumers will detect validation failures and route to the dead-letter subject:

```
  Status: INVALID — routing to DLQ
    /: must have required property 'employeeId'
    /email: must be string
  Published to hr.internal.employee.dlq
```

### 6. Tear down

```bash
make down
```

## What this demonstrates

- **Producer-side validation** (ADR-010): the producer validates data against the schema fetched from the catalog before publishing. Invalid data is rejected at the source.
- **Consumer-side validation** (ADR-010): both consumers independently fetch the schema from the `dataschema` URL and validate incoming messages.
- **Schema-driven contracts**: the same schema definition governs validation in Python, TypeScript, and Java — no code duplication.
- **Dead-letter routing**: validation failures produce structured DLQ messages with error details, consumer identity, and the original event.
- **CloudEvents compliance** (ADR-007): all messages follow the CloudEvents v1.0 envelope with mandatory attributes.
- **Language-agnostic**: three languages, one schema, consistent validation.

## NATS subjects

| Subject | Purpose |
|---------|---------|
| `hr.internal.employee.created` | Employee created events |
| `hr.internal.employee.dlq` | Dead-lettered invalid messages |

## Schema URL

```
https://gluendo.github.io/schema-registry/schemas/domains/hr/employee/v1.0.0/employee.schema.json
```

## Related ADRs

- [ADR-007: CloudEvents envelope](../adr/007-cloudevents-envelope.md)
- [ADR-008: Event patterns](../adr/008-event-patterns.md)
- [ADR-010: Runtime validation strategy](../adr/010-runtime-validation-strategy.md)
