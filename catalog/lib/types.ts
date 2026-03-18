export interface Domain {
  name: string;
  entityCount: number;
  entities: string[];
}

export interface Entity {
  domain: string;
  name: string;
  versions: string[];
  latestVersion: string;
}

export interface PropertyInfo {
  name: string;
  type: string;
  typeName?: string; // e.g., "Address", "Monetary Amount" — from inlined common type title
  format?: string;
  description?: string;
  required: boolean;
  enumValues?: { value: string; description?: string }[];
  constraints?: Record<string, unknown>;
  nested?: PropertyInfo[];
}

export interface ParsedSchema {
  domain: string;
  entity: string;
  version: string;
  id: string;
  title: string;
  description: string;
  properties: PropertyInfo[];
  raw: Record<string, unknown>;
}

export interface SearchEntry {
  domain: string;
  entity: string;
  version: string;
  title: string;
  description: string;
  fields: string;
  url: string;
}
