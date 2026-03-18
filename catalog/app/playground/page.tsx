import {
  getAllSchemas,
  getExampleForSchema,
  getCloudEventSchema,
} from "@/lib/schemas";
import { PlaygroundClient } from "./PlaygroundClient";

export const metadata = {
  title: "Validation Playground — Schema Registry",
};

export default function PlaygroundPage() {
  const cloudEventSchema = getCloudEventSchema();

  const schemas = getAllSchemas().map((s) => {
    const example = getExampleForSchema(s.domain, s.entity);
    return {
      id: s.id,
      label: `${s.domain}/${s.entity} ${s.version}`,
      raw: s.raw,
      exampleData: example ? JSON.stringify(example.data, null, 2) : null,
      exampleFull: example ? JSON.stringify(example.full, null, 2) : null,
    };
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Validation Playground
        </h1>
        <p className="mt-2 text-gray-600">
          Validate a JSON payload against a schema. Toggle between validating
          just the data payload or a full CloudEvents message.
        </p>
      </div>
      <PlaygroundClient
        schemas={schemas}
        cloudEventSchema={cloudEventSchema}
      />
    </div>
  );
}
