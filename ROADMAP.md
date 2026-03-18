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

- [ ] **Syntax highlighting** in JSON view (shiki — zero-runtime, SSR-compatible)
- [ ] **Common type attribution** — in the schema viewer, show which common type a nested object came from (e.g., "homeAddress: Address") instead of just expanding inline
- [ ] **Dark mode**
- [ ] **OpenGraph images** for schema pages (link previews when sharing URLs)
- [ ] **Schema statistics** on home page (total fields across all schemas, most-used common types, etc.)

## Tooling improvements

- [ ] **Pre-commit hooks** — run `schema-tools.py all` before commit to catch issues early
- [ ] **Schema diff in PRs** — GitHub Action that comments on PRs with a summary of schema changes (added/removed/changed fields)
- [ ] **Code generation** — generate TypeScript/Java/Python types from schemas (evaluate quicktype, json-schema-to-typescript, or similar)
- [ ] **Schema deprecation tracking** — mark schemas as deprecated, show warnings in catalog, enforce deprecation timelines

## Future considerations

- [ ] **Runtime schema serving** — if `application/schema+json` content-type becomes critical, add a lightweight serving layer (Cloudflare Workers, or custom domain with proper headers)
- [ ] **Confluent Schema Registry sync** — CI step that pushes bundled schemas to Confluent for Kafka-native consumers
- [ ] **AsyncAPI generation** — auto-generate AsyncAPI documents from schemas + CloudEvents envelope definition
- [ ] **Schema governance dashboard** — track schema ownership, review SLAs, version freshness, compliance status
