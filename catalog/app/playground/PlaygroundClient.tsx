"use client";

import { useState, useCallback } from "react";
import Ajv from "ajv";
import addFormats from "ajv-formats";

interface SchemaOption {
  id: string;
  label: string;
  raw: Record<string, unknown>;
  example: string | null;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const FALLBACK_PAYLOAD = `{
  "id": "example-001"
}`;

export function PlaygroundClient({
  schemas,
}: {
  schemas: SchemaOption[];
}) {
  const initial = schemas[0];
  const [selectedSchema, setSelectedSchema] = useState(initial?.id ?? "");
  const [payload, setPayload] = useState(initial?.example ?? FALLBACK_PAYLOAD);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleSchemaChange = (id: string) => {
    setSelectedSchema(id);
    setResult(null);
    const schema = schemas.find((s) => s.id === id);
    if (schema?.example) {
      setPayload(schema.example);
    }
  };

  const validate = useCallback(() => {
    const schema = schemas.find((s) => s.id === selectedSchema);
    if (!schema) {
      setResult({ valid: false, errors: ["No schema selected"] });
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(payload);
    } catch (e) {
      setResult({
        valid: false,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
      });
      return;
    }

    try {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);

      const schemaCopy = { ...schema.raw };
      delete schemaCopy["$schema"];
      delete schemaCopy["$id"];

      const valid = ajv.validate(schemaCopy, data);
      if (valid) {
        setResult({ valid: true, errors: [] });
      } else {
        setResult({
          valid: false,
          errors: (ajv.errors ?? []).map((e) => {
            const path = e.instancePath || "/";
            return `${path}: ${e.message}`;
          }),
        });
      }
    } catch (e) {
      setResult({
        valid: false,
        errors: [`Validation error: ${e instanceof Error ? e.message : String(e)}`],
      });
    }
  }, [selectedSchema, payload, schemas]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Schema
        </label>
        <select
          value={selectedSchema}
          onChange={(e) => handleSchemaChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {schemas.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          JSON Payload
        </label>
        <textarea
          value={payload}
          onChange={(e) => {
            setPayload(e.target.value);
            setResult(null);
          }}
          rows={15}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          spellCheck={false}
        />
      </div>

      <button
        onClick={validate}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        Validate
      </button>

      {result && (
        <div
          className={`p-4 rounded-lg border ${
            result.valid
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-sm font-semibold ${
                result.valid ? "text-green-800" : "text-red-800"
              }`}
            >
              {result.valid ? "Valid" : "Invalid"}
            </span>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i} className="text-sm text-red-700 font-mono">
                  {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
