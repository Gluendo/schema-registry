"use client";

import { useState } from "react";

export function RawJsonToggle({ raw }: { raw: Record<string, unknown> }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(raw, null, 2);

  const copy = async () => {
    await navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6">
      <button
        onClick={() => setShow(!show)}
        className="text-sm text-blue-600 hover:underline"
      >
        {show ? "Hide JSON" : "View JSON"}
      </button>
      {show && (
        <div className="relative mt-2">
          <button
            onClick={copy}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <pre className="p-4 bg-gray-950 text-gray-100 rounded-lg overflow-x-auto text-sm leading-relaxed">
            {json}
          </pre>
        </div>
      )}
    </div>
  );
}
