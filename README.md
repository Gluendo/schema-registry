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
  _common/                    # Shared types and enums
  domains/
    hr/employee/
      employee.schema.json    # Current version (edit in place)
      policies/               # Current policies
      v1.0.0/                 # Frozen snapshot (created by CI)
      v1.1.0/                 # Frozen snapshot
```

### Add a new schema

```bash
# 1. Create the folder structure
mkdir -p schemas/domains/{domain}/{entity}

# 2. Copy the template
cp templates/entity.schema.json schemas/domains/{domain}/{entity}/{entity}.schema.json

# 3. Edit, commit, open a PR — CI snapshots the version on merge
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Validate locally

```bash
make hooks           # Install pre-commit hook (validates schemas before commit)
make all             # Run all checks (validate, format, lint, compat)
make build           # Build catalog + EventCatalog for production
make preview         # Build and serve locally (mimics GitHub Pages)
make ec-dev          # Run EventCatalog dev server
```

### Run the catalog locally

```bash
cd catalog && npm install && npm run dev
# Open http://localhost:3000/schema-registry
```

EventCatalog is also available at `/schema-registry/eventcatalog/` — it provides service dependency graphs, domain exploration, and schema visualization.

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

## CI/CD

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| **Validate Schemas** | PR + push to main | Validates JSON, formatting, `$ref` targets, compatibility, version checks |
| **Schema Diff** | PR touching `schemas/` | Posts a PR comment with field-level changes and semver recommendation |
| **Snapshot Schemas** | Push to main | Creates frozen version snapshots from current files |
| **Deploy Catalog** | Push to main | Builds catalog + EventCatalog, deploys to GitHub Pages |

## Repository structure

```
schemas/
  _common/              Shared types and ISO enums
  domains/              Domain schemas (current file + version snapshots)
adr/                    Architecture Decision Records
catalog/                Next.js catalog app (GitHub Pages)
eventcatalog/           EventCatalog integration (services, visualizations)
tools/
  schema-tools.py       Validate, format, bundle, diff, snapshot
  lint.sh               Vacuum linter wrapper
templates/              Schema template for new entities
.githooks/              Pre-commit hook for schema validation
```

## License

Proprietary — Gluendo.
