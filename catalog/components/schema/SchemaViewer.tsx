"use client";

import { useState } from "react";
import type { ParsedSchema } from "@/lib/types";
import { PropertyTable } from "./PropertyTable";

export function SchemaViewer({ schema }: { schema: ParsedSchema }) {
  const [view, setView] = useState<"table" | "json">("table");
  const [copied, setCopied] = useState(false);

  const json = JSON.stringify(schema.raw, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-6">
        <code className="text-xs text-gray-400 font-mono">{schema.id}</code>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {schema.title}
        </h1>
        <p className="mt-2 text-gray-600">{schema.description}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">
            {view === "table" ? "Properties" : "JSON Schema"}
          </h2>
          <div className="flex items-center gap-2">
            {view === "json" && (
              <button
                onClick={copy}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            )}
            <div className="flex rounded-md border border-gray-200 text-xs">
              <button
                onClick={() => setView("table")}
                className={`px-3 py-1 rounded-l-md ${
                  view === "table"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setView("json")}
                className={`px-3 py-1 rounded-r-md border-l border-gray-200 ${
                  view === "json"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {view === "table" ? (
          <PropertyTable properties={schema.properties} />
        ) : (
          <pre className="p-4 bg-gray-950 text-gray-100 overflow-x-auto text-sm leading-relaxed">
            {json}
          </pre>
        )}
      </div>
    </div>
  );
}
