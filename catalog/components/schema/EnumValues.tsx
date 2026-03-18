"use client";

import { useState } from "react";

interface EnumValue {
  value: string;
  description?: string;
}

export function EnumValues({ values }: { values: EnumValue[] }) {
  const [expanded, setExpanded] = useState(false);
  const preview = values.slice(0, 5);
  const shown = expanded ? values : preview;
  const hasMore = values.length > 5;

  return (
    <div className="mt-1">
      <div className="flex flex-wrap gap-1">
        {shown.map((v) => (
          <span
            key={v.value}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-xs font-mono"
            title={v.description}
          >
            {v.value}
          </span>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs text-blue-600 hover:underline"
        >
          {expanded ? "Show less" : `+${values.length - 5} more`}
        </button>
      )}
    </div>
  );
}
