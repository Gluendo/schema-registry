import Link from "next/link";
import { getDomains, getAllSchemas } from "@/lib/schemas";
import { SearchBar } from "@/components/layout/SearchBar";

export default function HomePage() {
  const domains = getDomains();
  const schemaCount = getAllSchemas().length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Schema Catalog</h1>
        <p className="mt-2 text-gray-600">
          {domains.length} domains, {schemaCount} schemas. Browse by domain or
          search.
        </p>
      </div>

      <div className="mb-8">
        <SearchBar />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <Link
            key={domain.name}
            href={`/domains/${domain.name}`}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900 capitalize">
              {domain.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {domain.entityCount}{" "}
              {domain.entityCount === 1 ? "entity" : "entities"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {domain.entities.map((entity) => (
                <span
                  key={entity}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  {entity}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
