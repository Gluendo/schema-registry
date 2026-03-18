"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Browse" },
  { href: "/search", label: "Search" },
  { href: "/dependencies", label: "Dependencies" },
  { href: "/playground", label: "Playground" },
  { href: "/changelog", label: "Changelog" },
];

export function Header() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/" || pathname.startsWith("/domains");
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            Schema Registry
          </span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            by Gluendo
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                isActive(item.href)
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
