import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">Schema Registry</span>
          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            by Gluendo
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-gray-600 hover:text-gray-900">
            Browse
          </Link>
          <Link href="/search" className="text-gray-600 hover:text-gray-900">
            Search
          </Link>
          <Link href="/dependencies" className="text-gray-600 hover:text-gray-900">
            Dependencies
          </Link>
          <Link href="/playground" className="text-gray-600 hover:text-gray-900">
            Playground
          </Link>
          <Link href="/changelog" className="text-gray-600 hover:text-gray-900">
            Changelog
          </Link>
        </nav>
      </div>
    </header>
  );
}
