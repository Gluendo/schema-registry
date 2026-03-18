"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

export function SearchBar() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim()) {
      timerRef.current = setTimeout(() => {
        router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }, 300);
    }
  };

  return (
    <input
      type="text"
      onChange={(e) => handleChange(e.target.value)}
      placeholder="Start typing to search schemas..."
      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  );
}
