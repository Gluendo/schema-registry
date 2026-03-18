import type { PropertyInfo } from "@/lib/types";
import { TypeBadge } from "./TypeBadge";
import { EnumValues } from "./EnumValues";

function PropertyRow({
  prop,
  depth = 0,
}: {
  prop: PropertyInfo;
  depth?: number;
}) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-2 pr-3 font-mono text-sm" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
          {prop.name}
          {prop.required && (
            <span className="ml-1.5 text-red-500 text-xs" title="Required">*</span>
          )}
        </td>
        <td className="py-2 px-3">
          <TypeBadge type={prop.type} />
          {prop.format && (
            <span className="ml-1.5 text-xs text-gray-500">{prop.format}</span>
          )}
        </td>
        <td className="py-2 px-3 text-sm text-gray-600">
          {prop.description}
          {prop.enumValues && <EnumValues values={prop.enumValues} />}
          {prop.constraints && (
            <div className="mt-1 flex flex-wrap gap-1">
              {Object.entries(prop.constraints).map(([k, v]) => (
                <span
                  key={k}
                  className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600"
                >
                  {k}: {String(v)}
                </span>
              ))}
            </div>
          )}
        </td>
      </tr>
      {prop.nested?.map((child) => (
        <PropertyRow key={`${prop.name}.${child.name}`} prop={child} depth={depth + 1} />
      ))}
    </>
  );
}

export function PropertyTable({ properties }: { properties: PropertyInfo[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-sm text-gray-500">
            <th className="py-2 pr-3 pl-3 font-medium">Field</th>
            <th className="py-2 px-3 font-medium">Type</th>
            <th className="py-2 px-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop) => (
            <PropertyRow key={prop.name} prop={prop} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
