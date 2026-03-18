import { notFound } from "next/navigation";
import { getDomains, getEntities, getSchema, getVersions } from "@/lib/schemas";
import { compareSchemas } from "@/lib/diff";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CompareView } from "./CompareView";

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
    title: `Compare ${p.entity} versions — Schema Registry`,
  }));
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ domain: string; entity: string }>;
}) {
  const { domain, entity } = await params;
  const versions = getVersions(domain, entity);

  if (versions.length < 2) {
    return (
      <div>
        <Breadcrumb
          items={[
            { label: domain, href: `/domains/${domain}` },
            { label: entity, href: `/domains/${domain}/${entity}` },
            { label: "Compare" },
          ]}
        />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Compare versions
        </h1>
        <p className="text-gray-500">
          Only one version exists. Nothing to compare yet.
        </p>
      </div>
    );
  }

  // Default: compare the two most recent versions
  const newVer = versions[0];
  const oldVer = versions[1];
  const oldSchema = getSchema(domain, entity, oldVer);
  const newSchema = getSchema(domain, entity, newVer);
  if (!oldSchema || !newSchema) notFound();

  const { diffs, summary } = compareSchemas(oldSchema.properties, newSchema.properties);

  return (
    <div>
      <Breadcrumb
        items={[
          { label: domain, href: `/domains/${domain}` },
          { label: entity, href: `/domains/${domain}/${entity}` },
          { label: "Compare" },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-900 mb-2">
        Compare {entity} versions
      </h1>
      <p className="text-gray-600 mb-6">
        {oldVer} → {newVer}
      </p>

      <div className="flex gap-3 mb-6">
        {summary.added > 0 && (
          <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-md text-sm font-medium">
            +{summary.added} added
          </span>
        )}
        {summary.removed > 0 && (
          <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
            -{summary.removed} removed
          </span>
        )}
        {summary.changed > 0 && (
          <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm font-medium">
            ~{summary.changed} changed
          </span>
        )}
        {summary.added === 0 && summary.removed === 0 && summary.changed === 0 && (
          <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-sm">
            No changes
          </span>
        )}
      </div>

      <CompareView diffs={diffs} versions={versions} domain={domain} entity={entity} />
    </div>
  );
}
