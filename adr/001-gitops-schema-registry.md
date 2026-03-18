# ADR-001: Git as the source of truth for schema governance

## Status

Accepted

## Date

2026-03-18

## Context

Integration platforms rely on canonical (agnostic) messages to decouple producers and consumers — enabling any ERP, application, or custom tool to participate without tight point-to-point coupling. These canonical messages need a schema registry: a place to define, review, version, and distribute the JSON schemas that describe them.

Several approaches exist for schema registries:

- **Dedicated schema registry services** (e.g., Confluent Schema Registry, Apicurio): runtime services that store and serve schemas, often tightly coupled to a specific broker (Kafka).
- **Database-backed registries**: custom services storing schemas in a database with a REST API.
- **Git-backed registries**: schemas are files in a Git repository, governed by standard Git workflows (PRs, reviews, CI/CD).

The schema registry must support environments where governance, auditability, and change control are critical. Integration teams should not be the bottleneck — producer teams must own their schemas (see ADR-003).

Gluendo operates across multiple clients, so the solution must be reproducible, portable, and not depend on a specific vendor's infrastructure.

## Decision

We will use **Git as the single source of truth** for all schema definitions, with a GitOps workflow for contribution, review, and release.

Specifically:

- Schemas are stored as files in a Git repository.
- All changes go through pull requests with mandatory review.
- CI pipelines validate schemas on every PR (linting, compatibility checks, structure enforcement).
- Merging to the main branch constitutes publication.
- Tags and releases provide stable version references for consumers.
- If a runtime registry is needed (e.g., Confluent Schema Registry for Kafka serialization), it is synchronized from Git — never the other way around.

## Consequences

### Positive

- **Auditability**: full history of every change, who made it, who approved it, and why.
- **Familiar workflow**: teams already know Git, PRs, and code review — no new tooling to learn for contribution.
- **No infrastructure dependency**: the registry works with any Git provider (GitHub, GitLab, Bitbucket), no dedicated service to operate.
- **Reproducibility**: easy to fork or replicate for new clients.
- **Offline access**: schemas are always available locally.
- **CI/CD native**: validation, compatibility checks, and publishing are standard pipeline steps.

### Negative

- **No native runtime query API**: consumers cannot query schemas by metadata at runtime without an additional serving layer.
- **Discovery requires tooling**: browsing schemas in a Git repo is functional but not user-friendly — a catalog UI will eventually be needed.
- **Sync complexity**: if a runtime registry (Confluent, etc.) is needed downstream, a sync mechanism must be built and maintained.

### Risks

- Teams unfamiliar with Git may need onboarding.
- Without proper CI enforcement, invalid schemas could be merged.
