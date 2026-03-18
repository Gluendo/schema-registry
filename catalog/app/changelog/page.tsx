import Link from "next/link";
import { getAllSchemas } from "@/lib/schemas";

export const metadata = {
  title: "Changelog — Schema Registry",
};

export default function ChangelogPage() {
  const schemas = getAllSchemas();

  // Group by domain/entity, show all versions
  const grouped: Record<
    string,
    { domain: string; entity: string; versions: { version: string; title: string; description: string }[] }
  > = {};

  for (const s of schemas) {
    const key = `${s.domain}/${s.entity}`;
    if (!grouped[key]) {
      grouped[key] = { domain: s.domain, entity: s.entity, versions: [] };
    }
    grouped[key].versions.push({
      version: s.version,
      title: s.title,
      description: s.description,
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Changelog</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          All schema versions in the registry. Subscribe to changes via the{" "}
          <a
            href="/schema-registry/feed.xml"
            className="text-blue-600 hover:underline"
          >
            RSS feed
          </a>
          .
        </p>
      </div>

      <div className="space-y-6">
        {Object.values(grouped).map((group) => (
          <div
            key={`${group.domain}/${group.entity}`}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                {group.domain}
              </span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {group.entity}
              </h2>
            </div>
            <div className="space-y-2">
              {group.versions.map((v) => (
                <Link
                  key={v.version}
                  href={`/domains/${group.domain}/${group.entity}/${v.version}`}
                  className="flex items-start gap-3 p-3 -mx-1 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs font-mono shrink-0 mt-0.5">
                    {v.version}
                  </span>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {v.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {v.description}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
