# ADR-003: Producer ownership of schemas and topics

## Status

Accepted

## Date

2026-03-18

## Context

In traditional integration platforms, a central integration team typically:

- Defines and maintains all message schemas.
- Manages all topics/queues.
- Acts as the intermediary for every integration change.

This model creates a bottleneck: every new integration, every schema change, every new system onboarding requires the integration team's involvement. It does not scale and produces schemas that reflect the integration team's interpretation rather than the producer's domain knowledge.

The goal of this platform is to shift ownership to the teams that produce the data, while the integration platform team provides governance, tooling, and standards.

## Decision

We adopt a **producer ownership model** where the team that produces a message is responsible for:

1. **Defining the schema**: the producer team creates and maintains the JSON Schema for their canonical messages.
2. **Owning the topic/queue**: the producer team decides the topic structure and is the authority on what gets published.
3. **Ensuring quality**: the producer team is responsible for the correctness and completeness of their schemas.
4. **Managing evolution**: the producer team drives schema versioning, respecting platform-wide compatibility rules (see ADR-004).

The integration platform team is responsible for:

- Providing the schema registry infrastructure (this repository, CI pipelines, tooling).
- Defining and enforcing standards (naming conventions, compatibility rules, review process).
- Maintaining shared/common types (e.g., address, monetary amount) in collaboration with domain teams.
- Supporting consumer teams in discovering and using schemas.

### Enforcement mechanism

Ownership is enforced through **CODEOWNERS** (or equivalent in the Git provider):

```
# Each domain folder is owned by its producing team
/schemas/domains/hr/          @hr-team
/schemas/domains/finance/     @finance-team
/schemas/domains/supply-chain/ @supply-chain-team

# Common types require platform team review
/schemas/_common/             @platform-team
```

A PR modifying schemas in a domain folder **requires approval from that domain's owning team**. This prevents the integration team from unilaterally changing schemas and ensures producer accountability.

## Consequences

### Positive

- **Scalability**: new integrations do not bottleneck on a central team.
- **Domain accuracy**: schemas reflect the producer's domain knowledge, not a second-hand interpretation.
- **Accountability**: the team that knows the data best is responsible for its contract.
- **Reduced integration team toil**: the platform team focuses on standards and tooling, not individual schema definitions.

### Negative

- **Higher initial effort for producer teams**: teams must learn JSON Schema and the contribution workflow.
- **Inconsistency risk**: without strong standards and review, different teams may model similar concepts differently.
- **Common types governance**: shared types (address, currency, etc.) need cross-team coordination, which can be slow.

### Mitigations

- Provide templates, examples, and a clear contribution guide to lower the barrier for producer teams.
- Enforce naming conventions and structure through CI automation.
- Maintain a curated library of common/shared types that producer teams are encouraged (or required) to reuse.
- The platform team reviews all PRs for standards compliance, even if they don't own the domain.
