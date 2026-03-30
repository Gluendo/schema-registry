# Roadmap

## Completed

- [x] Architecture Decision Records (ADR-001 to ADR-011)
- [x] Git-backed schema registry with domain-driven structure
- [x] Common types library (address, monetary-amount, uuid, etag, error, tags, traceparent, tracestate, contact-info)
- [x] ISO enum types (country codes, currency codes)
- [x] Reference schemas (HR/employee, Finance/invoice)
- [x] Schema tooling: validate, format, bundle, lint (Vacuum), compat, examples
- [x] CI pipeline: schema validation + catalog deployment (GitHub Pages)
- [x] Catalog app: browse, search, schema viewer (table/JSON toggle), schema URL with copy
- [x] Version comparison with diff view
- [x] Validation playground (AJV-powered, loads examples per schema)
- [x] Dependency graph (common type usage)
- [x] Changelog + RSS feed
- [x] PR template with checklist
- [x] Makefile for common operations
- [x] CONTRIBUTING.md producer guide
- [x] CloudEvents envelope schema with full envelope validation in playground
- [x] Reference schemas: 4 domains (HR/employee, Finance/invoice, Supply Chain/purchase-order, CRM/customer)
- [x] Audience projection policies (OPA/Rego example for employee: internal vs partner)
- [x] Consumer getting started guide (TypeScript, Python, Java examples)
- [x] Client template with setup script for bootstrapping client registries

## Catalog improvements

- [x] **Syntax highlighting** in JSON view (shiki, pre-rendered at build time)
- [x] **Common type attribution** — inlined types show their original name (e.g., "Address", "Monetary Amount") in purple
- [x] **Dark mode** — toggle in header, persisted to localStorage, respects system preference
- [x] **OpenGraph metadata** for schema pages (title + description for link previews)
- [x] **Schema statistics** on home page (domains, entities, versions, fields, common types)

## EventCatalog integration

- [x] **EventCatalog generator** — `make ec-dev` generates EventCatalog-compatible content from `schemas/domains/` and serves it locally
- [x] **EventCatalog deployment** — built and deployed alongside main catalog at `/eventcatalog/`
- [x] **Producers/consumers mapping** — `services.yaml` config drives service generation with sends/receives wiring
- [ ] **Evaluate replacing custom catalog** — once EventCatalog covers all current catalog features, retire the Next.js app

## Tooling improvements

- [x] **Pre-commit hooks** — `make hooks` installs `.githooks/pre-commit` that validates schemas before commit
- [x] **Schema diff in PRs** — GitHub Action posts field-level schema diff with semver recommendation as PR comment
- [x] **Current-file workflow** — schemas edited in place with CI-managed version snapshots (natural git diffs)
- [x] **Auto-snapshot on merge** — CI creates frozen version directories from current files on push to main
- [ ] **Code generation** — generate TypeScript/Java/Python types from schemas (evaluate quicktype, json-schema-to-typescript, or similar)
- [ ] **Schema deprecation tracking** — mark schemas as deprecated, show warnings in catalog, enforce deprecation timelines

## Future considerations

- [ ] **Runtime schema serving** — if `application/schema+json` content-type becomes critical, add a lightweight serving layer (Cloudflare Workers, or custom domain with proper headers)
- [ ] **Confluent Schema Registry sync** — CI step that pushes bundled schemas to Confluent for Kafka-native consumers
- [ ] **AsyncAPI generation** — auto-generate AsyncAPI documents from schemas + CloudEvents envelope definition
- [ ] **Schema governance dashboard** — track schema ownership, review SLAs, version freshness, compliance status
