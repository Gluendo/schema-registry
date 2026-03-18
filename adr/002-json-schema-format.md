# ADR-002: JSON Schema as the canonical schema format

## Status

Accepted

## Date

2026-03-18

## Context

The integration platform needs a schema format to describe canonical messages. The format must be:

- **Technology-agnostic**: usable regardless of the transport (Kafka, RabbitMQ, HTTP, file-based, etc.) or consumer technology stack.
- **Widely supported**: tooling and libraries available in all major languages (Java, C#, Python, TypeScript, Go, etc.).
- **Self-describing**: schemas should be readable by humans and machines without specialized knowledge.
- **Composable**: shared types (address, monetary amount, etc.) must be referenceable across schemas.
- **Validatable**: messages can be validated against schemas at build time, test time, and runtime.

Candidates considered:

| Format | Strengths | Weaknesses |
|--------|-----------|------------|
| **JSON Schema** | Universal, rich ecosystem, transport-agnostic, human-readable | Verbose, no built-in serialization format |
| **Avro** | Compact binary, native Kafka support, schema evolution | Kafka-centric, less readable, weaker non-JVM support |
| **Protobuf** | Compact binary, strong typing, code generation | Requires compilation step, opinionated, less natural for REST/HTTP |
| **AsyncAPI / OpenAPI** | API-first, great documentation | Higher-level (wraps JSON Schema), not a schema format itself |

## Decision

We will use **JSON Schema (draft 2020-12)** as the canonical format for all message schemas.

Key reasons:

1. **Transport independence**: JSON Schema describes data shape, not wire format. The same schema works whether the message travels over Kafka, HTTP, AMQP, or a file drop.
2. **Ecosystem breadth**: validators, code generators, UI renderers, and editors exist for every major language and platform.
3. **Human readability**: JSON is the lingua franca of enterprise integrations. Schemas are readable without specialized tooling.
4. **Composability**: `$ref` allows shared type definitions to be referenced across schemas, supporting DRY principles.
5. **Client-friendly**: no compilation step, no specialized tooling required to get started. A text editor and a JSON validator are sufficient.

If a specific transport requires a binary format (e.g., Avro for Kafka), schemas will be **derived from** the canonical JSON Schema — the JSON Schema remains authoritative.

## Consequences

### Positive

- Schemas are immediately usable by any team, regardless of their technology stack.
- Rich validation at every stage: IDE, CI, runtime.
- No vendor or transport lock-in.
- Smooth path to generating AsyncAPI or OpenAPI documentation from schemas.

### Negative

- JSON is more verbose than binary formats — not ideal for high-throughput, low-latency scenarios (mitigated by deriving binary schemas when needed).
- JSON Schema draft 2020-12 is powerful but has a learning curve for advanced features (conditional schemas, `$dynamicRef`, etc.).
- No built-in code generation standard — we will need to choose and standardize a code generation tool per language.

### Risks

- Teams may be tempted to use Avro or Protobuf directly, bypassing the canonical schema. CI enforcement and clear documentation must prevent this.
