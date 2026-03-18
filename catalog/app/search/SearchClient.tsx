"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Fuse from "fuse.js";
import type { SearchEntry } from "@/lib/types";

export function SearchClient({ entries }: { entries: SearchEntry[] }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  const fuse = useMemo(
    () =>
      new Fuse(entries, {
        keys: [
          { name: "title", weight: 2 },
          { name: "fields", weight: 1.5 },
          { name: "description", weight: 1 },
        ],
        threshold: 0.4,
        includeMatches: true,
      }),
    [entries]
  );

  const results = query.trim()
    ? fuse.search(query).map((r) => r.item)
    : entries;

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, field, or description..."
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
        autoFocus
      />

      <div className="space-y-3">
        {results.map((entry) => (
          <Link
            key={`${entry.domain}/${entry.entity}/${entry.version}`}
            href={entry.url}
            className="block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                {entry.domain}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {entry.title}
              </span>
              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs font-mono">
                {entry.version}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {entry.description}
            </p>
          </Link>
        ))}
        {results.length === 0 && query.trim() && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No schemas found for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
