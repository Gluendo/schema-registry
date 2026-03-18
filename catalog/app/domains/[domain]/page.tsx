import Link from "next/link";
import { notFound } from "next/navigation";
import { getDomains, getEntities, getVersions, getSchema } from "@/lib/schemas";
import { Breadcrumb } from "@/components/ui/Breadcrumb";

export function generateStaticParams() {
  return getDomains().map((d) => ({ domain: d.name }));
}

export function generateMetadata({ params }: { params: Promise<{ domain: string }> }) {
  return params.then((p) => ({
    title: `${p.domain} — Schema Registry`,
  }));
}

export default async function DomainPage({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain } = await params;
  const entities = getEntities(domain);
  if (entities.length === 0) notFound();

  return (
    <div>
      <Breadcrumb items={[{ label: domain }]} />

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize mb-2">
        {domain}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {entities.length} {entities.length === 1 ? "entity" : "entities"} in
        this domain.
      </p>

      <div className="space-y-3">
        {entities.map((entity) => {
          const schema = getSchema(domain, entity.name, entity.latestVersion);
          return (
            <Link
              key={entity.name}
              href={`/domains/${domain}/${entity.name}`}
              className="block p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {schema?.title ?? entity.name}
                  </h2>
                  {schema?.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                      {schema.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 ml-4">
                  {entity.versions.map((v) => (
                    <span
                      key={v}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs font-mono"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
