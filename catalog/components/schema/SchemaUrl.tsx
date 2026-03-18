"use client";

import { useState } from "react";

export function SchemaUrl({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
            Schema URL — use this in CloudEvents <code className="text-gray-600 dark:text-gray-400">dataschema</code> or as a <code className="text-gray-600 dark:text-gray-400">$ref</code> target
          </span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-mono text-blue-600 hover:underline break-all"
          >
            {url}
          </a>
        </div>
        <button
          onClick={copy}
          className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            copied
              ? "bg-green-600 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {copied ? "Copied!" : "Copy URL"}
        </button>
      </div>
    </div>
  );
}
