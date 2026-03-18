"use client";

import { useState } from "react";
import type { CommonSchema } from "@/lib/schemas";
import { PropertyTable } from "@/components/schema/PropertyTable";

export function CommonSchemaCard({
  schema,
  highlightedJson,
}: {
  schema: CommonSchema;
  highlightedJson: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<"table" | "json">("table");

  const hasProperties = schema.properties.length > 0;
  const rawEnum = schema.raw.enum;
  const isEnum = Array.isArray(rawEnum);
  const enumValues: string[] = isEnum ? rawEnum.map(String) : [];

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {schema.title}
            </h3>
            <code className="text-xs text-gray-400 dark:text-gray-500 font-mono">
              {schema.name}.schema.json
            </code>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {schema.description}
          </p>
        </div>
        <span className="text-gray-400 dark:text-gray-500 mt-1 shrink-0 ml-4">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-800">
          {(hasProperties || isEnum) && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isEnum
                  ? `${enumValues.length} values`
                  : `${schema.properties.length} properties`}
              </span>
              <div className="flex rounded-md border border-gray-200 dark:border-gray-700 text-xs">
                <button
                  onClick={() => setView("table")}
                  className={`px-3 py-1 rounded-l-md ${
                    view === "table"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {isEnum ? "Values" : "Table"}
                </button>
                <button
                  onClick={() => setView("json")}
                  className={`px-3 py-1 rounded-r-md border-l border-gray-200 dark:border-gray-700 ${
                    view === "json"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  JSON
                </button>
              </div>
            </div>
          )}

          {view === "table" ? (
            isEnum ? (
              <div className="p-4 flex flex-wrap gap-1.5">
                {enumValues.map((val) => (
                  <span
                    key={val}
                    className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-xs font-mono"
                  >
                    {val}
                  </span>
                ))}
              </div>
            ) : hasProperties ? (
              <PropertyTable properties={schema.properties} />
            ) : (
              <div
                className="overflow-x-auto text-sm leading-relaxed [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!rounded-none"
                dangerouslySetInnerHTML={{ __html: highlightedJson }}
              />
            )
          ) : (
            <div
              className="overflow-x-auto text-sm leading-relaxed [&_pre]:!p-4 [&_pre]:!m-0 [&_pre]:!rounded-none"
              dangerouslySetInnerHTML={{ __html: highlightedJson }}
            />
          )}
        </div>
      )}
    </div>
  );
}
