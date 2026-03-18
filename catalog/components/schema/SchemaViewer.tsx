import type { ParsedSchema } from "@/lib/types";
import { PropertyTable } from "./PropertyTable";
import { RawJsonToggle } from "./RawJsonToggle";

export function SchemaViewer({ schema }: { schema: ParsedSchema }) {
  return (
    <div>
      <div className="mb-6">
        <code className="text-xs text-gray-400 font-mono">{schema.id}</code>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {schema.title}
        </h1>
        <p className="mt-2 text-gray-600">{schema.description}</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-medium text-gray-700">Properties</h2>
        </div>
        <PropertyTable properties={schema.properties} />
      </div>

      <RawJsonToggle raw={schema.raw} />
    </div>
  );
}
