import Link from "next/link";
import { notFound } from "next/navigation";
import { getDomains, getEntities, getSchema, getVersions } from "@/lib/schemas";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SchemaViewer } from "@/components/schema/SchemaViewer";
import { SchemaUrl } from "@/components/schema/SchemaUrl";

export function generateStaticParams() {
  const params: { domain: string; entity: string }[] = [];
  for (const domain of getDomains()) {
    for (const entity of getEntities(domain.name)) {
      params.push({ domain: domain.name, entity: entity.name });
    }
  }
  return params;
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ domain: string; entity: string }>;
}) {
  return params.then((p) => ({
    title: `${p.entity} — ${p.domain} — Schema Registry`,
  }));
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ domain: string; entity: string }>;
}) {
  const { domain, entity } = await params;
  const versions = getVersions(domain, entity);
  if (versions.length === 0) notFound();

  const latestVersion = versions[0];
  const schema = getSchema(domain, entity, latestVersion);
  if (!schema) notFound();

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain, href: `/domains/${domain}` },
          { label: entity },
        ]}
      />

      <SchemaUrl
        url={`https://gluendo.github.io/schema-registry/schemas/domains/${domain}/${entity}/${latestVersion}/${entity}.schema.json`}
      />

      {versions.length > 1 && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-gray-500">Versions:</span>
          {versions.map((v) => (
            <Link
              key={v}
              href={`/domains/${domain}/${entity}/${v}`}
              className={`px-2 py-0.5 rounded text-xs font-mono ${
                v === latestVersion
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {v}
              {v === latestVersion && " (latest)"}
            </Link>
          ))}
        </div>
      )}

      <SchemaViewer schema={schema} />
    </div>
  );
}
