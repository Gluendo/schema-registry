# ADR-005: Multi-client reusability through a starter kit and optional shared commons

## Status

Accepted

## Date

2026-03-18

## Context

Gluendo is a consulting company that deploys integration platforms for multiple clients. Each client has:

- **Common integration patterns**: HR, finance, supply chain messages follow similar structures across organizations.
- **Client-specific needs**: custom fields, local regulations, proprietary systems, industry-specific semantics.

Building a schema registry from scratch for each client is wasteful. Copying and diverging creates maintenance nightmares. We need a model that maximizes reuse while respecting client autonomy.

### Key principle: client ownership

Once a schema lands in a client's repository, it belongs to the client. There is no hidden dependency back to Gluendo. The client must be able to operate their schema registry independently. This rules out models that create tight coupling (submodules, mandatory upstream references).

### Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **One repo per client, no reuse** | Full isolation | Duplicated effort, no learning transfer |
| **Git submodule linking** | Live upstream sync | Tight coupling, breaks client autonomy |
| **Starter kit (copy & own)** | Clean handoff, client autonomy | No automatic upstream updates |
| **Starter kit + optional shared commons via URL** | Best of both worlds | Requires hosting for commons |

## Decision

We adopt a two-layer model: a **starter kit** for bootstrapping, and an **optional shared commons** served over resolvable URLs.

### Layer 1: The Gluendo Starter Kit (this repository)

This repository is a **template and reference library** that Gluendo uses to bootstrap new client schema registries. It contains:

- **Reference schemas**: Gluendo's recommended canonical schemas for common domains (HR, finance, supply chain, etc.). These are battle-tested patterns derived from real client engagements.
- **Common type templates**: reusable type definitions (address, monetary amount, contact info, etc.) that clients can adopt.
- **Tooling and CI templates**: reusable pipeline definitions, validation scripts, schema linting rules.
- **Standards and documentation**: ADRs, contribution guides, naming conventions.

When onboarding a new client:

1. The relevant reference schemas and common types are **copied** into the client's own repository.
2. The client team adapts them to their specific needs.
3. From that point on, the client's schemas are **theirs** — no ongoing dependency on this repository.

Gluendo can periodically review the starter kit against learnings from client engagements and upstream improvements, but clients pull updates deliberately, not automatically.

### Layer 2: Gluendo Shared Commons (optional)

For common type definitions that Gluendo wants to maintain centrally and make available across clients (e.g., ISO country codes, standard currency types), a **hosted schema endpoint** is provided:

```
https://schemas.gluendo.io/_common/types/address.schema.json
https://schemas.gluendo.io/_common/types/monetary-amount.schema.json
```

Client schemas can reference these via standard `$ref`:

```json
{
  "$id": "urn:client-x:schema:hr:employee:v1.0.0",
  "properties": {
    "homeAddress": {
      "$ref": "https://schemas.gluendo.io/_common/types/address.schema.json"
    }
  }
}
```

This works because `$ref` resolves URLs natively — no custom resolver needed.

**Important constraints for the shared commons:**

- Schemas served at a URL are **immutable once published**. A published URL always returns the same schema. Versioning is handled by URL path (e.g., `/types/v2/address.schema.json`).
- Clients can choose to reference the hosted commons or copy them locally. Referencing is convenient; copying provides full independence. Both are valid.
- The shared commons must have high availability if clients depend on it for CI validation. Alternatively, clients can cache or vendor the schemas locally and use the URL only as a canonical identifier.

### Extension mechanism

Client schemas extend reference schemas using JSON Schema composition. Since schemas live in the client's own repo, `$ref` uses relative paths for local references:

```json
{
  "$id": "urn:client-x:schema:hr:employee:v1.1.0",
  "allOf": [
    { "$ref": "../v1.0.0/employee.schema.json" },
    {
      "properties": {
        "costCenter": {
          "type": "string",
          "description": "Client-specific cost center code"
        }
      }
    }
  ]
}
```

For shared commons, `$ref` uses the resolvable URL (see above).

## Consequences

### Positive

- **Clean client autonomy**: no hidden dependencies. Clients own their schemas fully.
- **Accelerated onboarding**: new clients start with proven schemas instead of blank pages.
- **Cross-client learning**: improvements discovered at one client can be upstreamed to the starter kit for future clients to benefit.
- **Gluendo IP**: the starter kit and shared commons become valuable, evolving assets.
- **`$ref` just works**: resolvable URLs for shared commons, relative paths for local schemas — no custom resolvers needed.
- **Flexible dependency**: clients choose their level of coupling to Gluendo commons (reference via URL, or copy locally).

### Negative

- **No automatic upstream sync**: once schemas are copied to a client, they diverge. Improvements to the starter kit must be manually reviewed and adopted.
- **Hosting requirement**: the shared commons needs a reliable hosting endpoint with appropriate availability guarantees.
- **Version coordination**: if a client references a shared commons URL and Gluendo publishes a new version, the client must update their `$ref` deliberately.

### Mitigations

- Maintain a changelog for the starter kit so clients can see what changed and decide whether to adopt updates.
- The shared commons follows the same SemVer and immutability rules as all other schemas (ADR-004). Published URLs never change.
- Provide tooling to diff a client's schemas against the latest starter kit version, making it easy to spot and adopt improvements.
