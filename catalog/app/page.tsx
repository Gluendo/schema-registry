import Link from "next/link";
import { getDomains, getAllSchemas, getDependencyGraph } from "@/lib/schemas";
import { SearchBar } from "@/components/layout/SearchBar";

export default function HomePage() {
  const domains = getDomains();
  const schemas = getAllSchemas();
  const deps = getDependencyGraph();

  const totalFields = schemas.reduce((sum, s) => sum + s.properties.length, 0);
  const totalEntities = domains.reduce((sum, d) => sum + d.entityCount, 0);

  const stats = [
    { label: "Domains", value: domains.length },
    { label: "Entities", value: totalEntities },
    { label: "Schema versions", value: schemas.length },
    { label: "Fields", value: totalFields },
    { label: "Common types", value: deps.length },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Schema Catalog</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Canonical JSON Schema definitions for the integration platform.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-center"
          >
            <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8">
        <SearchBar />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {domains.map((domain) => (
          <Link
            key={domain.name}
            href={`/domains/${domain.name}`}
            className="block p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
          >
            <h2 className="text-lg font-semibold capitalize">
              {domain.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {domain.entityCount}{" "}
              {domain.entityCount === 1 ? "entity" : "entities"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {domain.entities.map((entity) => (
                <span
                  key={entity}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs"
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
