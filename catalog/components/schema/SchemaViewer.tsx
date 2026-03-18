"use client";

import { useState } from "react";
import type { ParsedSchema } from "@/lib/types";
import { PropertyTable } from "./PropertyTable";

export function SchemaViewer({
  schema,
  highlightedJson,
}: {
  schema: ParsedSchema;
  highlightedJson?: string;
}) {
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
        <code className="text-xs text-gray-400 dark:text-gray-500 font-mono">{schema.id}</code>
        <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
          {schema.title}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">{schema.description}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            <div className="flex rounded-md border border-gray-200 dark:border-gray-700 text-xs">
              <button
                onClick={() => setView("table")}
                className={`px-3 py-1 rounded-l-md ${
                  view === "table"
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setView("json")}
                className={`px-3 py-1 rounded-r-md border-l border-gray-200 dark:border-gray-700 ${
                  view === "json"
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                JSON
              </button>
            </div>
          </div>
        </div>

        {view === "table" ? (
          <PropertyTable properties={schema.properties} />
        ) : highlightedJson ? (
          <div
            className="overflow-x-auto text-sm leading-relaxed [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!rounded-none"
            dangerouslySetInnerHTML={{ __html: highlightedJson }}
          />
        ) : (
          <pre className="p-4 bg-gray-950 text-gray-100 overflow-x-auto text-sm leading-relaxed">
            {json}
          </pre>
        )}
      </div>
    </div>
  );
}
