# Architecture Decision Records

This folder contains the Architecture Decision Records (ADRs) for the Gluendo Schema Registry.

ADRs document the key architectural decisions made during the design and evolution of this project. They follow the format described in [Michael Nygard's article](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Index

| # | Title | Status |
|---|-------|--------|
| [001](001-gitops-schema-registry.md) | Git as the source of truth for schema governance | Accepted |
| [002](002-json-schema-format.md) | JSON Schema as the canonical schema format | Accepted |
| [003](003-producer-ownership.md) | Producer ownership of schemas and topics | Accepted |
| [004](004-versioning-and-compatibility.md) | Semantic versioning with backward compatibility enforcement | Accepted |
| [005](005-multi-client-reusability.md) | Multi-client reusability through a starter kit and optional shared commons | Accepted |
| [006](006-repository-structure.md) | Domain-driven repository structure | Accepted |
| [007](007-cloudevents-envelope.md) | CloudEvents as the envelope standard | Accepted |
| [008](008-event-patterns.md) | Event patterns and their relationship to schemas | Accepted |
| [009](009-audience-segmentation.md) | Audience segmentation via projection profiles (policy-as-code) | Accepted |
| [010](010-runtime-validation-strategy.md) | Runtime validation strategy | Accepted |
