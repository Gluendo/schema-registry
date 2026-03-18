import { getAllSchemas, getExampleForSchema } from "@/lib/schemas";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata = {
  title: "Validation Playground — Schema Registry",
};

export default function PlaygroundPage() {
  const schemas = getAllSchemas().map((s) => {
    const example = getExampleForSchema(s.domain, s.entity);
    return {
      id: s.id,
      label: `${s.domain}/${s.entity} ${s.version}`,
      raw: s.raw,
      example: example ? JSON.stringify(example, null, 2) : null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Validation Playground
        </h1>
        <p className="mt-2 text-gray-600">
          Select a schema and validate a JSON payload against it. Example
          payloads are loaded automatically.
        </p>
      </div>
      <PlaygroundClient schemas={schemas} />
    </div>
  );
}
