## What changed

<!-- Describe the schema change: new entity, new version, field additions, etc. -->

## Type of change

- [ ] New entity schema
- [ ] New version of existing schema (minor — backward compatible)
- [ ] Breaking change (major version bump)
- [ ] Common type or enum change
- [ ] Tooling / CI / documentation

## Checklist

- [ ] Schema is valid JSON and valid JSON Schema (draft 2020-12)
- [ ] `$id` URN matches the file path (domain, entity, version)
- [ ] `$schema`, `$id`, `title`, and `description` are present
- [ ] Only the entity identifier is in `required`
- [ ] Property names use `camelCase`
- [ ] Enums use `oneOf`/`const` with descriptions
- [ ] `$ref` targets point to existing schemas
- [ ] Version bump is appropriate (patch/minor/major)

## If breaking change

- [ ] Major version bumped
- [ ] Migration plan documented below
- [ ] Deprecation timeline for previous version communicated

<!-- Migration plan (if applicable): -->
