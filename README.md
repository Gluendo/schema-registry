# Schema Registry

Gluendo's starter kit for GitOps-driven schema governance — canonical JSON Schema definitions, versioning, validation tooling, and CI templates for integration platforms.

**[Browse the catalog](https://gluendo.github.io/schema-registry/)**

## What is this?

A Git-backed registry of [JSON Schema](https://json-schema.org/) definitions that describe the canonical messages flowing through an integration platform. Producers own their schemas, consumers discover and validate against them.

This repository serves as:

- **A starter kit** — battle-tested reference schemas and tooling that Gluendo uses to bootstrap client integration platforms
- **A living catalog** — browsable at [gluendo.github.io/schema-registry](https://gluendo.github.io/schema-registry/)
- **A governance framework** — ADRs, CI validation, and contribution workflows for schema lifecycle management

## Quick start

### Browse schemas

Visit the [catalog](https://gluendo.github.io/schema-registry/) or explore the `schemas/` directory:

```
schemas/
  _common/              # Shared types (address, monetary-amount, etc.) and enums (country codes, currencies)
  domains/
    hr/employee/        # HR domain — employee entity
    finance/invoice/    # Finance domain — invoice entity
```

### Add a new schema

```bash
# 1. Create the folder structure
mkdir -p schemas/domains/{domain}/{entity}/v1.0.0

# 2. Copy the template
cp templates/entity.schema.json schemas/domains/{domain}/{entity}/v1.0.0/{entity}.schema.json

# 3. Edit, commit, open a PR
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Validate locally

```bash
# Validate syntax, formatting, and $ref resolution
python3 tools/schema-tools.py all

# Bundle schemas (inline $ref into self-contained files)
python3 tools/schema-tools.py bundle schemas dist

# Lint with Vacuum
./tools/lint.sh dist
```

### Run the catalog locally

```bash
cd catalog && npm install && npm run dev
# Open http://localhost:3000/schema-registry
```

### Run EventCatalog (alternative visualization)

```bash
cd eventcatalog && npm install
make ec-dev
# Open http://localhost:3000
```

EventCatalog provides service dependency graphs, domain exploration, and schema visualization generated from the same `schemas/` directory.

## Architecture decisions

The design is documented in [Architecture Decision Records](adr/):

| # | Decision |
|---|----------|
| [001](adr/001-gitops-schema-registry.md) | Git as source of truth |
| [002](adr/002-json-schema-format.md) | JSON Schema (draft 2020-12) |
| [003](adr/003-producer-ownership.md) | Producer ownership of schemas |
| [004](adr/004-versioning-and-compatibility.md) | Semantic versioning + backward compatibility |
| [005](adr/005-multi-client-reusability.md) | Starter kit + optional shared commons |
| [006](adr/006-repository-structure.md) | Domain-driven folder structure |
| [007](adr/007-cloudevents-envelope.md) | CloudEvents envelope standard |
| [008](adr/008-event-patterns.md) | Fat / delta / skinny event patterns |
| [009](adr/009-audience-segmentation.md) | Audience segmentation via policy-as-code |
| [010](adr/010-runtime-validation-strategy.md) | Runtime validation strategy |
| [011](adr/011-schema-catalog-app.md) | Schema catalog app (GitHub Pages) |

## Repository structure

```
adr/                    Architecture Decision Records
schemas/
  _common/types/        Shared types (address, monetary-amount, uuid, etag, error, tags, traceparent, ...)
  _common/enums/        ISO enums (country codes, currency codes)
  domains/              Domain schemas (one schema per entity per version)
catalog/                Next.js catalog app (static export → GitHub Pages)
eventcatalog/           EventCatalog integration (generator + config)
tools/
  schema-tools.py       Validate, format, check $refs, bundle schemas
  lint.sh               Vacuum linter wrapper
templates/              Schema template for new entities
```

## License

Proprietary — Gluendo.
