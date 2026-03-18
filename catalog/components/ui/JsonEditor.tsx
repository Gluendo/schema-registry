"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Editor from "react-simple-code-editor";
import { codeToHtml } from "shiki";

export function JsonEditor({
  value,
  onChange,
  rows = 18,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  const [highlighted, setHighlighted] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const highlight = useCallback((code: string) => {
    // Debounce shiki calls — it's async so we update state
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const html = await codeToHtml(code, {
          lang: "json",
          theme: "github-dark",
        });
        // Extract just the inner code content (strip the <pre><code> wrapper)
        const match = html.match(/<code[^>]*>([\s\S]*)<\/code>/);
        if (match) {
          setHighlighted(match[1]);
        }
      } catch {
        // Fallback to plain text if shiki fails (e.g., invalid JSON mid-edit)
        setHighlighted(
          code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        );
      }
    }, 150);

    // Return escaped text synchronously for initial render
    return highlighted;
  }, [highlighted]);

  // Initial highlight on mount
  useEffect(() => {
    highlight(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-[#24292e] text-sm"
      style={{ minHeight: `${rows * 1.5}em` }}
    >
      <Editor
        value={value}
        onValueChange={(code) => {
          onChange(code);
          highlight(code);
        }}
        highlight={(code) =>
          highlighted || code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        }
        padding={16}
        style={{
          fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
          fontSize: "0.875rem",
          lineHeight: "1.5",
          color: "#e1e4e8",
          minHeight: `${rows * 1.5}em`,
        }}
        textareaClassName="focus:outline-none"
      />
    </div>
  );
}
