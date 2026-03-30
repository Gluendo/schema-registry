#!/usr/bin/env node
/**
 * Generate EventCatalog content from the schema registry.
 *
 * Reads  ../schemas/domains/{domain}/{entity}/{version}/{entity}.schema.json
 * Reads  services.yaml for producer/consumer mappings
 * Emits  domains/, services/ directories that EventCatalog understands.
 */

import { readFileSync, mkdirSync, writeFileSync, cpSync, readdirSync, existsSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';

const BASE = resolve(dirname(new URL(import.meta.url).pathname));
const SCHEMAS_ROOT = resolve(BASE, '..', 'schemas');
const DOMAINS_SRC = join(SCHEMAS_ROOT, 'domains');
const OUT_DOMAINS = join(BASE, 'domains');
const OUT_SERVICES = join(BASE, 'services');

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

/** Minimal YAML parser for our simple services.yaml (no dependency needed). */
function parseServicesYaml(text) {
  const services = [];
  let current = null;
  let currentList = null;

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    // New service entry
    if (/^\s{2}- id:\s*(.+)/.test(line)) {
      if (current) services.push(current);
      current = { id: line.match(/id:\s*(.+)/)[1].trim(), produces: [], consumes: [] };
      currentList = null;
      continue;
    }
    if (!current) continue;
    // List header (produces: / consumes: with no value)
    const listHeader = line.match(/^\s{4}(produces|consumes):\s*$/);
    if (listHeader) {
      currentList = listHeader[1];
      continue;
    }
    // Simple key-value fields
    const kv = line.match(/^\s{4,6}(\w+):\s*(.+)/);
    if (kv) {
      const [, key, val] = kv;
      if (key === 'language' || key === 'url') {
        if (!current.repository) current.repository = {};
        current.repository[key] = val.trim();
      } else {
        current[key] = val.trim();
      }
      currentList = null;
      continue;
    }
    // List items under produces/consumes
    const item = line.match(/^\s{6,8}- (.+)/);
    if (item && currentList) {
      current[currentList].push(item[1].trim());
    }
  }
  if (current) services.push(current);
  return services;
}

function eventFrontmatter(id, name, version, summary, { producers, consumers } = {}) {
  const lines = [
    '---',
    `id: ${id}`,
    `name: ${name}`,
    `version: "${version}"`,
    `summary: |`,
    `  ${summary}`,
    `schemaPath: schema.json`,
  ];
  if (producers && producers.length > 0) {
    lines.push(`producers:`);
    for (const p of producers) lines.push(`  - ${p}`);
  }
  if (consumers && consumers.length > 0) {
    lines.push(`consumers:`);
    for (const c of consumers) lines.push(`  - ${c}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Load services config
// ---------------------------------------------------------------------------

const servicesFile = join(BASE, 'services.yaml');
const services = existsSync(servicesFile)
  ? parseServicesYaml(readFileSync(servicesFile, 'utf-8'))
  : [];

// Build lookup: eventId -> [serviceId, ...]
const producersOf = {};
const consumersOf = {};
for (const svc of services) {
  for (const eventId of svc.produces || []) {
    (producersOf[eventId] ??= []).push(svc.id);
  }
  for (const eventId of svc.consumes || []) {
    (consumersOf[eventId] ??= []).push(svc.id);
  }
}

// Track latest version per event for service frontmatter
const eventLatestVersion = {};

// ---------------------------------------------------------------------------
// Clean previous output
// ---------------------------------------------------------------------------

for (const dir of [OUT_DOMAINS, OUT_SERVICES]) {
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

    // Track for service generation
    eventLatestVersion[eventId] = latest.semver;

    // --- Latest version (at event root) ---
    const eventOut = join(OUT_DOMAINS, domainTitle, 'events', name);
    mkdirSync(eventOut, { recursive: true });

    writeFileSync(join(eventOut, 'index.mdx'), [
      eventFrontmatter(eventId, name, latest.semver, summary, {
        producers: producersOf[eventId],
        consumers: consumersOf[eventId],
      }),
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
        eventFrontmatter(eventId, oldSchema.title || name, v.semver, oldSchema.description || summary, {
          producers: producersOf[eventId],
          consumers: consumersOf[eventId],
        }),
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

// ---------------------------------------------------------------------------
// Emit services
// ---------------------------------------------------------------------------

for (const svc of services) {
  const svcOut = join(OUT_SERVICES, svc.name);
  mkdirSync(svcOut, { recursive: true });

  const sends = (svc.produces || [])
    .filter(id => eventLatestVersion[id])
    .map(id => ({ id, version: eventLatestVersion[id] }));
  const receives = (svc.consumes || [])
    .filter(id => eventLatestVersion[id])
    .map(id => ({ id, version: eventLatestVersion[id] }));

  const lines = [
    '---',
    `id: ${svc.id}`,
    `name: ${svc.name}`,
    `version: "1.0.0"`,
  ];
  if (svc.summary) {
    lines.push(`summary: |`);
    lines.push(`  ${svc.summary}`);
  }
  if (svc.repository) {
    lines.push(`repository:`);
    if (svc.repository.language) lines.push(`  language: ${svc.repository.language}`);
    if (svc.repository.url) lines.push(`  url: ${svc.repository.url}`);
  }
  if (sends.length > 0) {
    lines.push(`sends:`);
    for (const s of sends) {
      lines.push(`  - id: ${s.id}`);
      lines.push(`    version: "${s.version}"`);
    }
  }
  if (receives.length > 0) {
    lines.push(`receives:`);
    for (const r of receives) {
      lines.push(`  - id: ${r.id}`);
      lines.push(`    version: "${r.version}"`);
    }
  }
  lines.push('---');
  lines.push('');
  lines.push(svc.summary || `${svc.name} service.`);
  lines.push('');

  writeFileSync(join(svcOut, 'index.mdx'), lines.join('\n'));
  console.log(`  SVC ${svc.id}  sends=${sends.map(s => s.id).join(', ') || '–'}  receives=${receives.map(r => r.id).join(', ') || '–'}`);
}

console.log('\nDone. Run `npm run dev` to preview the catalog.');
