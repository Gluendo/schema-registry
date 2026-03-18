import Link from "next/link";
import { notFound } from "next/navigation";
import { getDomains, getEntities, getSchema, getVersions } from "@/lib/schemas";
import { highlightJson } from "@/lib/highlight";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SchemaViewer } from "@/components/schema/SchemaViewer";
import { SchemaUrl } from "@/components/schema/SchemaUrl";

export function generateStaticParams() {
  const params: { domain: string; entity: string; version: string }[] = [];
  for (const domain of getDomains()) {
    for (const entity of getEntities(domain.name)) {
      for (const version of entity.versions) {
        params.push({
          domain: domain.name,
          entity: entity.name,
          version,
        });
      }
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; entity: string; version: string }>;
}) {
  const p = await params;
  const schema = getSchema(p.domain, p.entity, p.version);
  const title = `${schema?.title ?? p.entity} ${p.version} — Schema Registry`;
  const description = schema?.description ?? `JSON Schema for ${p.entity} entity in the ${p.domain} domain.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Gluendo Schema Registry",
    },
  };
}

export default async function VersionPage({
  params,
}: {
  params: Promise<{ domain: string; entity: string; version: string }>;
}) {
  const { domain, entity, version } = await params;
  const schema = getSchema(domain, entity, version);
  if (!schema) notFound();

  const versions = getVersions(domain, entity);
  const schemaUrl = `https://gluendo.github.io/schema-registry/schemas/domains/${domain}/${entity}/${version}/${entity}.schema.json`;
  const highlighted = await highlightJson(JSON.stringify(schema.raw, null, 2));

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain, href: `/domains/${domain}` },
          { label: entity, href: `/domains/${domain}/${entity}` },
          { label: version },
        ]}
      />

      <SchemaUrl url={schemaUrl} />

      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">Versions:</span>
        {versions.map((v) => (
          <Link
            key={v}
            href={`/domains/${domain}/${entity}/${v}`}
            className={`px-2 py-0.5 rounded text-xs font-mono ${
              v === version
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {v}
          </Link>
        ))}
      </div>

      <SchemaViewer schema={schema} highlightedJson={highlighted} />
    </div>
  );
}
