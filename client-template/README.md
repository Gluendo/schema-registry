# Schema Registry — {{CLIENT_NAME}}

This repository contains the canonical JSON Schema definitions for {{CLIENT_NAME}}'s integration platform.

Built on [Gluendo's Schema Registry starter kit](https://github.com/Gluendo/schema-registry).

## Quick start

```bash
# Validate all schemas
python3 tools/schema-tools.py all

# Bundle schemas (inline $ref)
python3 tools/schema-tools.py bundle schemas dist

# Validate examples
python3 tools/schema-tools.py examples schemas
```

## Adding a schema

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

```bash
mkdir -p schemas/domains/{domain}/{entity}/v1.0.0
cp templates/entity.schema.json schemas/domains/{domain}/{entity}/v1.0.0/{entity}.schema.json
# Edit, commit, open a PR
```

## Architecture

This registry follows the Gluendo integration platform architecture:

- **Producer ownership** — the team that produces data owns its schemas
- **Semantic versioning** — backward-compatible changes are minor bumps, breaking changes require major bumps
- **CloudEvents envelope** — all messages use CloudEvents v1.0 with mandatory `traceparent` and `dataschema`
- **One schema per entity** — event lifecycle (created, updated, etc.) is expressed in CloudEvents `type`, not in schema files
