#!/usr/bin/env node
/**
 * Generate EventCatalog content from the schema registry.
 *
 * Reads  ../schemas/domains/{domain}/{entity}/{version}/{entity}.schema.json
 * Emits  domains/, events/ directories that EventCatalog understands.
 */

import { readFileSync, mkdirSync, writeFileSync, cpSync, readdirSync, existsSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';

const SCHEMAS_ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..', 'schemas');
const DOMAINS_SRC = join(SCHEMAS_ROOT, 'domains');
const OUT_DOMAINS = resolve(dirname(new URL(import.meta.url).pathname), 'domains');
const OUT_EVENTS = resolve(dirname(new URL(import.meta.url).pathname), 'events');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseVersion(v) {
  const m = v.match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], raw: v, semver: `${m[1]}.${m[2]}.${m[3]}` };
}

function compareVersions(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

function titleCase(s) {
  return s.replace(/(^|[-_ ])(\w)/g, (_, sep, c) => (sep === '-' || sep === '_' ? ' ' : sep) + c.toUpperCase());
}

function readSchema(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function eventFrontmatter(id, name, version, summary, domain) {
  const lines = [
    '---',
    `id: ${id}`,
    `name: ${name}`,
    `version: "${version}"`,
    `summary: |`,
    `  ${summary}`,
    `schemaPath: schema.json`,
    '---',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Clean previous output
// ---------------------------------------------------------------------------

for (const dir of [OUT_DOMAINS, OUT_EVENTS]) {
  if (existsSync(dir)) rmSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Walk domains
// ---------------------------------------------------------------------------

const domains = readdirSync(DOMAINS_SRC, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

for (const domain of domains) {
  const domainPath = join(DOMAINS_SRC, domain);
  const domainTitle = titleCase(domain);

  // --- Domain index.mdx ---
  const domainOut = join(OUT_DOMAINS, domainTitle);
  mkdirSync(domainOut, { recursive: true });
  writeFileSync(join(domainOut, 'index.mdx'), [
    '---',
    `id: ${domain}`,
    `name: ${domainTitle}`,
    `version: "1.0.0"`,
    '---',
    '',
    `Canonical schemas for the **${domainTitle}** domain.`,
    '',
  ].join('\n'));

  // --- Entities within domain ---
  const entities = readdirSync(domainPath, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const entity of entities) {
    const entityPath = join(domainPath, entity);

    // Collect versions
    const versions = readdirSync(entityPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => parseVersion(d.name))
      .filter(Boolean)
      .sort(compareVersions);

    if (versions.length === 0) continue;

    const latest = versions[versions.length - 1];
    const older = versions.slice(0, -1);
    const eventId = `${domain}.${entity}`;

    // Read latest schema for metadata
    const schemaFile = join(entityPath, latest.raw, `${entity}.schema.json`);
    const schema = readSchema(schemaFile);
    if (!schema) {
      console.warn(`  SKIP ${eventId}@${latest.semver} — cannot read ${schemaFile}`);
      continue;
    }

    const name = schema.title || titleCase(entity);
    const summary = schema.description || `${name} schema`;

    // --- Latest version (at event root) ---
    const eventOut = join(OUT_DOMAINS, domainTitle, 'events', name);
    mkdirSync(eventOut, { recursive: true });

    writeFileSync(join(eventOut, 'index.mdx'), [
      eventFrontmatter(eventId, name, latest.semver, summary, domain),
      '',
      `## ${name}`,
      '',
      summary,
      '',
    ].join('\n'));
    cpSync(schemaFile, join(eventOut, 'schema.json'));

    // --- Older versions ---
    for (const v of older) {
      const oldSchemaFile = join(entityPath, v.raw, `${entity}.schema.json`);
      const oldSchema = readSchema(oldSchemaFile);
      if (!oldSchema) continue;

      const versionedOut = join(eventOut, 'versioned', v.semver);
      mkdirSync(versionedOut, { recursive: true });

      writeFileSync(join(versionedOut, 'index.mdx'), [
        eventFrontmatter(eventId, oldSchema.title || name, v.semver, oldSchema.description || summary, domain),
        '',
        `## ${oldSchema.title || name}`,
        '',
        oldSchema.description || summary,
        '',
      ].join('\n'));
      cpSync(oldSchemaFile, join(versionedOut, 'schema.json'));
    }

    console.log(`  OK  ${eventId}  latest=${latest.semver}  versions=${versions.map(v => v.semver).join(', ')}`);
  }
}

console.log('\nDone. Run `npm run dev` to preview the catalog.');
