# ADR-011: Schema catalog application for discoverability and serving

## Status

Accepted

## Date

2026-03-18

## Context

ADR-001 identified two negative consequences of a Git-backed schema registry:

- **No native runtime query API**: consumers cannot query schemas by metadata at runtime without an additional serving layer.
- **Discovery requires tooling**: browsing schemas in a Git repo is functional but not user-friendly.

Additionally:

- ADR-007 requires `dataschema` URLs that resolve to actual JSON Schema documents. Without a serving layer, these URLs have no endpoint.
- ADR-004 defines versioning rules and compatibility guarantees, but there is no visual way to compare schema versions or identify breaking changes.
- ADR-009 introduces audience-based projection policies that need to be visible alongside the schemas they apply to.
- The schema registry is intended as a Gluendo demonstrator (ADR-005), so it must be presentable and self-explanatory to prospective clients.

### What the catalog needs to support

| Capability | Source ADR | Priority |
|-----------|-----------|----------|
| **Browse schemas** by domain, entity, version | ADR-006 | Must-have |
| **Search** schemas by name, field, description | ADR-001 | Must-have |
| **View** rendered schema with field documentation | ADR-002 | Must-have |
| **Serve raw JSON** at stable URLs (`dataschema` resolution) | ADR-007 | Must-have |
| **Compare versions** with diff and breaking change detection | ADR-004 | Should-have |
| **View audience profiles** per schema | ADR-009 | Should-have |
| **Schema validation playground** (paste a payload, validate against a schema) | ADR-010 | Nice-to-have |

### Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| **GitHub Pages (static)** | Zero infra, free | No search, no API, no auth on private repos (free plan), no interactivity |
| **Backstage plugin** | Enterprise-grade catalog, rich ecosystem | Heavy infra, overkill for a demonstrator, complex setup |
| **Custom Next.js app on Vercel** | Full control, good DX, grows with needs, native Vercel deployment, API routes for raw schema serving | Must build and maintain a web app |
| **Custom Astro app on Vercel** | Lightweight, content-focused | Smaller ecosystem, less natural for interactive features (search, validation playground) |

## Decision

We build a **Next.js application deployed on Vercel** that serves as the schema catalog and the raw schema endpoint.

### Key design principles

1. **The Git repo remains the source of truth.** The catalog reads from the bundled `dist/` output (produced by `schema-tools.py bundle`). It does not have its own database.
2. **Schemas are served as static JSON at stable URLs.** The URL structure matches the repository path: `/domains/{domain}/{entity}/{version}/{entity}.schema.json`. These are the URLs used in CloudEvents `dataschema` attributes.
3. **The catalog is a read-only view.** Contribution happens via Git (PRs, reviews). The catalog is for discovery and consumption, not editing.
4. **Build incrementally.** Start with browse + serve, add search and comparison as the schema library grows.

### Application structure

```
catalog/
  app/
    page.tsx                                  # Home — domain list, search bar
    domains/[domain]/
      page.tsx                                # Entity list for a domain
    domains/[domain]/[entity]/
      page.tsx                                # Version list + latest schema viewer
    domains/[domain]/[entity]/[version]/
      page.tsx                                # Full schema viewer + audience profiles
    domains/[domain]/[entity]/compare/
      page.tsx                                # Side-by-side version diff
    api/schemas/[...path]/
      route.ts                                # Raw JSON serving (Content-Type: application/schema+json)
  lib/
    schemas.ts                                # Load and index schemas from dist/
    search.ts                                 # Full-text search over schema metadata
```

### URL design

| URL | Purpose | Content-Type |
|-----|---------|-------------|
| `/` | Catalog home page | text/html |
| `/domains/hr/employee` | Schema viewer (human) | text/html |
| `/domains/hr/employee/v1.0.0` | Version-specific viewer (human) | text/html |
| `/api/schemas/domains/hr/employee/v1.0.0/employee.schema.json` | Raw schema (machine) | application/schema+json |

The `/api/schemas/` prefix separates machine-readable endpoints from human-readable pages. The `dataschema` URL in CloudEvents messages points to the `/api/schemas/` path.

### Deployment

- **Platform**: GitHub Pages (free, works with public repos, no additional account needed)
- **URL**: `https://gluendo.github.io/schema-registry/` (or custom domain via GitHub Pages settings)
- **Build trigger**: GitHub Actions workflow on push to `main` (touching `catalog/`, `schemas/`, or `tools/`)
- **Static export**: Next.js builds with `output: 'export'`, producing a fully static site in `out/`. No server-side runtime.
- **Schema serving**: bundled schemas are copied into `public/schemas/` at build time, served as static JSON files alongside the HTML pages.
- **No runtime dependency on the Git repo**: the catalog is fully self-contained after build.

### Search strategy

For the initial implementation, search operates on a pre-built index generated at build time from schema metadata (`$id`, `title`, `description`, property names, property descriptions). This avoids runtime search infrastructure.

As the schema library grows, this can be upgraded to a client-side search library (e.g., Fuse.js, Lunr) or a hosted search service.

## Consequences

### Positive

- **`dataschema` URLs work**: CloudEvents consumers can resolve and validate against real, hosted schemas.
- **Discoverability**: producers and consumers can browse, search, and understand schemas without cloning the repo.
- **Demonstrator value**: a polished catalog makes the schema registry tangible for prospective Gluendo clients.
- **Incremental**: starts simple (browse + serve), grows with the product (search, comparison, validation playground).
- **No infrastructure burden**: GitHub Pages handles deployment and SSL. No servers to operate, no additional accounts needed.

### Negative

- **Another artifact to maintain**: the catalog app is code that needs updates as features are added.
- **Build-time coupling**: the catalog depends on the bundled `dist/` output. Changes to the bundling process affect the catalog.
- **GitHub Pages limitation**: `Content-Type` for served schemas is `application/json` (not `application/schema+json`). This is acceptable for most consumers but not fully spec-compliant. If strict content-type control is needed, a dedicated serving layer can be added later.

### Mitigations

- Keep the catalog app thin — it's a view layer over the schema files, not a platform.
- The catalog reads standard JSON Schema files from `dist/`. The static export can be hosted anywhere (GitHub Pages, S3, Netlify, Cloudflare Pages).
- Automated deployment via GitHub Actions minimizes maintenance overhead.
