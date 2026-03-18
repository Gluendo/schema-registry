import fs from "fs";
import path from "path";
import type {
  Domain,
  Entity,
  ParsedSchema,
  PropertyInfo,
  SearchEntry,
} from "./types";

const DIST_DIR = path.resolve(process.cwd(), "../dist");
const DOMAINS_DIR = path.join(DIST_DIR, "domains");

function isDir(p: string): boolean {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listDirs(p: string): string[] {
  if (!isDir(p)) return [];
  return fs
    .readdirSync(p)
    .filter((name) => isDir(path.join(p, name)))
    .sort();
}

function compareSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Parse JSON Schema properties into PropertyInfo[]
// ---------------------------------------------------------------------------

function resolveType(prop: Record<string, unknown>): string {
  if (prop.oneOf && Array.isArray(prop.oneOf)) return "enum";
  const t = prop.type;
  if (Array.isArray(t)) return t.filter((x) => x !== "null").join(" | ");
  if (typeof t === "string") return t;
  if (prop.$ref) return "object";
  return "unknown";
}

function extractConstraints(
  prop: Record<string, unknown>
): Record<string, unknown> | undefined {
  const keys = [
    "pattern",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
  ];
  const result: Record<string, unknown> = {};
  for (const k of keys) {
    if (prop[k] !== undefined) result[k] = prop[k];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function parseProperties(
  properties: Record<string, Record<string, unknown>> | undefined,
  required: string[] = []
): PropertyInfo[] {
  if (!properties) return [];

  return Object.entries(properties).map(([name, prop]) => {
    const info: PropertyInfo = {
      name,
      type: resolveType(prop),
      required: required.includes(name),
    };

    if (prop.format) info.format = prop.format as string;
    if (prop.description) info.description = prop.description as string;

    // Enum values from oneOf/const
    if (prop.oneOf && Array.isArray(prop.oneOf)) {
      info.enumValues = (prop.oneOf as Record<string, unknown>[]).map((v) => ({
        value: String(v.const ?? ""),
        description: v.description as string | undefined,
      }));
    }

    info.constraints = extractConstraints(prop);

    // Nested object properties
    if (
      prop.properties &&
      typeof prop.properties === "object"
    ) {
      info.nested = parseProperties(
        prop.properties as Record<string, Record<string, unknown>>,
        (prop.required as string[]) ?? []
      );
    }

    // Array of objects
    if (prop.type === "array" && prop.items && typeof prop.items === "object") {
      const items = prop.items as Record<string, unknown>;
      if (items.properties) {
        info.type = "array<object>";
        info.nested = parseProperties(
          items.properties as Record<string, Record<string, unknown>>,
          (items.required as string[]) ?? []
        );
      }
    }

    return info;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function getDomains(): Domain[] {
  return listDirs(DOMAINS_DIR).map((name) => {
    const entities = listDirs(path.join(DOMAINS_DIR, name));
    return { name, entityCount: entities.length, entities };
  });
}

export function getEntities(domain: string): Entity[] {
  const domainDir = path.join(DOMAINS_DIR, domain);
  return listDirs(domainDir).map((name) => {
    const versions = listDirs(path.join(domainDir, name)).sort(compareSemver);
    return {
      domain,
      name,
      versions,
      latestVersion: versions[0] ?? "v1.0.0",
    };
  });
}

export function getVersions(domain: string, entity: string): string[] {
  return listDirs(path.join(DOMAINS_DIR, domain, entity)).sort(compareSemver);
}

export function getSchema(
  domain: string,
  entity: string,
  version: string
): ParsedSchema | null {
  const schemaPath = path.join(
    DOMAINS_DIR,
    domain,
    entity,
    version,
    `${entity}.schema.json`
  );

  try {
    const raw = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    return {
      domain,
      entity,
      version,
      id: raw.$id ?? "",
      title: raw.title ?? entity,
      description: raw.description ?? "",
      properties: parseProperties(raw.properties, raw.required),
      raw,
    };
  } catch {
    return null;
  }
}

export function getAllSchemas(): ParsedSchema[] {
  const schemas: ParsedSchema[] = [];
  for (const domain of getDomains()) {
    for (const entity of getEntities(domain.name)) {
      for (const version of entity.versions) {
        const schema = getSchema(domain.name, entity.name, version);
        if (schema) schemas.push(schema);
      }
    }
  }
  return schemas;
}

export function getSearchEntries(): SearchEntry[] {
  return getAllSchemas().map((s) => ({
    domain: s.domain,
    entity: s.entity,
    version: s.version,
    title: s.title,
    description: s.description,
    fields: s.properties.map((p) => p.name).join(" "),
    url: `/domains/${s.domain}/${s.entity}/${s.version}`,
  }));
}

export function getRawSchema(
  schemaPath: string
): Record<string, unknown> | null {
  const fullPath = path.join(DIST_DIR, schemaPath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  } catch {
    return null;
  }
}
