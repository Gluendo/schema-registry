import { getCommonSchemas } from "@/lib/schemas";
import { highlightJson } from "@/lib/highlight";
import { CommonSchemaCard } from "./CommonSchemaCard";

export const metadata = {
  title: "Common Types & Enums — Schema Registry",
};

export default async function CommonsPage() {
  const schemas = getCommonSchemas();
  const types = schemas.filter((s) => s.category === "types");
  const enums = schemas.filter((s) => s.category === "enums");

  // Pre-render highlighted JSON for all commons
  const highlightedMap: Record<string, string> = {};
  for (const s of schemas) {
    highlightedMap[s.name] = await highlightJson(
      JSON.stringify(s.raw, null, 2)
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Common Types & Enums
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Shared building blocks referenced by domain schemas via{" "}
          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-1 rounded">
            $ref
          </code>
          . Use these to keep your schemas consistent and DRY.
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Types ({types.length})
        </h2>
        <div className="space-y-4">
          {types.map((s) => (
            <CommonSchemaCard
              key={s.name}
              schema={s}
              highlightedJson={highlightedMap[s.name]}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Enums ({enums.length})
        </h2>
        <div className="space-y-4">
          {enums.map((s) => (
            <CommonSchemaCard
              key={s.name}
              schema={s}
              highlightedJson={highlightedMap[s.name]}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
