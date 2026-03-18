"use client";

import { useState, useCallback } from "react";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { JsonEditor } from "@/components/ui/JsonEditor";

interface SchemaOption {
  id: string;
  label: string;
  raw: Record<string, unknown>;
  exampleData: string | null;
  exampleFull: string | null;
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
  cloudEventSchema,
}: {
  schemas: SchemaOption[];
  cloudEventSchema: Record<string, unknown> | null;
}) {
  const initial = schemas[0];
  const [selectedSchema, setSelectedSchema] = useState(initial?.id ?? "");
  const [mode, setMode] = useState<"data" | "cloudevent">("data");
  const [payload, setPayload] = useState(
    initial?.exampleData ?? FALLBACK_PAYLOAD
  );
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleSchemaChange = (id: string) => {
    setSelectedSchema(id);
    setResult(null);
    const schema = schemas.find((s) => s.id === id);
    if (schema) {
      setPayload(
        mode === "cloudevent"
          ? schema.exampleFull ?? FALLBACK_PAYLOAD
          : schema.exampleData ?? FALLBACK_PAYLOAD
      );
    }
  };

  const handleModeChange = (newMode: "data" | "cloudevent") => {
    setMode(newMode);
    setResult(null);
    const schema = schemas.find((s) => s.id === selectedSchema);
    if (schema) {
      setPayload(
        newMode === "cloudevent"
          ? schema.exampleFull ?? FALLBACK_PAYLOAD
          : schema.exampleData ?? FALLBACK_PAYLOAD
      );
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
        errors: [
          `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        ],
      });
      return;
    }

    try {
      const ajv = new Ajv({ allErrors: true, strict: false });
      addFormats(ajv);

      const errors: string[] = [];

      if (mode === "cloudevent" && cloudEventSchema) {
        // Validate envelope
        const envelopeCopy = { ...cloudEventSchema };
        delete envelopeCopy["$schema"];
        delete envelopeCopy["$id"];
        const envelopeValid = ajv.validate(envelopeCopy, data);
        if (!envelopeValid) {
          for (const e of ajv.errors ?? []) {
            errors.push(`envelope${e.instancePath || "/"}: ${e.message}`);
          }
        }

        // Also validate the data field against the selected schema
        const msg = data as Record<string, unknown>;
        if (msg.data && typeof msg.data === "object") {
          const ajv2 = new Ajv({ allErrors: true, strict: false });
          addFormats(ajv2);
          const schemaCopy = { ...schema.raw };
          delete schemaCopy["$schema"];
          delete schemaCopy["$id"];
          const dataValid = ajv2.validate(schemaCopy, msg.data);
          if (!dataValid) {
            for (const e of ajv2.errors ?? []) {
              errors.push(`data${e.instancePath || "/"}: ${e.message}`);
            }
          }
        }
      } else {
        // Validate data only
        const schemaCopy = { ...schema.raw };
        delete schemaCopy["$schema"];
        delete schemaCopy["$id"];
        const valid = ajv.validate(schemaCopy, data);
        if (!valid) {
          for (const e of ajv.errors ?? []) {
            errors.push(`${e.instancePath || "/"}: ${e.message}`);
          }
        }
      }

      setResult({
        valid: errors.length === 0,
        errors,
      });
    } catch (e) {
      setResult({
        valid: false,
        errors: [
          `Validation error: ${e instanceof Error ? e.message : String(e)}`,
        ],
      });
    }
  }, [selectedSchema, payload, schemas, mode, cloudEventSchema]);

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Schema
          </label>
          <select
            value={selectedSchema}
            onChange={(e) => handleSchemaChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {schemas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Validate
          </label>
          <div className="flex rounded-md border border-gray-200 dark:border-gray-700 text-xs">
            <button
              onClick={() => handleModeChange("data")}
              className={`px-3 py-2 rounded-l-md ${
                mode === "data"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              Data only
            </button>
            <button
              onClick={() => handleModeChange("cloudevent")}
              className={`px-3 py-2 rounded-r-md border-l border-gray-200 dark:border-gray-700 ${
                mode === "cloudevent"
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              CloudEvent
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {mode === "cloudevent"
            ? "Full CloudEvents message"
            : "Data payload"}
        </label>
        <JsonEditor
          value={payload}
          onChange={(code) => {
            setPayload(code);
            setResult(null);
          }}
          rows={18}
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
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"
          }`}
        >
          <span
            className={`text-sm font-semibold ${
              result.valid ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
            }`}
          >
            {result.valid
              ? mode === "cloudevent"
                ? "Valid — envelope and data both pass"
                : "Valid"
              : "Invalid"}
          </span>
          {result.errors.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.errors.map((err, i) => (
                <li key={i} className="text-sm text-red-700 dark:text-red-300 font-mono">
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
