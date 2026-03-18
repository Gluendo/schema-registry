import type { PropertyDiff } from "@/lib/diff";
import { TypeBadge } from "@/components/schema/TypeBadge";

const changeStyles: Record<string, string> = {
  added: "bg-green-50 border-l-4 border-green-400",
  removed: "bg-red-50 border-l-4 border-red-400",
  changed: "bg-yellow-50 border-l-4 border-yellow-400",
  unchanged: "",
};

const changeLabels: Record<string, { text: string; className: string }> = {
  added: { text: "Added", className: "bg-green-100 text-green-800" },
  removed: { text: "Removed", className: "bg-red-100 text-red-800" },
  changed: { text: "Changed", className: "bg-yellow-100 text-yellow-800" },
};

function DiffRow({ diff, depth = 0 }: { diff: PropertyDiff; depth?: number }) {
  if (diff.change === "unchanged" && !diff.nested) return null;

  const prop = diff.new ?? diff.old;
  const label = changeLabels[diff.change];

  return (
    <>
      <tr className={`border-b border-gray-100 ${changeStyles[diff.change]}`}>
        <td
          className="py-2 pr-3 font-mono text-sm"
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          {diff.name}
        </td>
        <td className="py-2 px-3">
          {prop && <TypeBadge type={prop.type} />}
        </td>
        <td className="py-2 px-3">
          {label && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${label.className}`}
            >
              {label.text}
            </span>
          )}
        </td>
        <td className="py-2 px-3 text-sm text-gray-600">
          {diff.details?.map((d, i) => (
            <div key={i} className="text-xs text-gray-500">
              {d}
            </div>
          ))}
          {!diff.details && prop?.description && (
            <span className="text-gray-400">{prop.description}</span>
          )}
        </td>
      </tr>
      {diff.nested?.map((child) => (
        <DiffRow
          key={`${diff.name}.${child.name}`}
          diff={child}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

export function CompareView({
  diffs,
}: {
  diffs: PropertyDiff[];
  versions: string[];
  domain: string;
  entity: string;
}) {
  const visibleDiffs = diffs.filter(
    (d) => d.change !== "unchanged" || d.nested?.some((n) => n.change !== "unchanged")
  );

  if (visibleDiffs.length === 0) {
    return (
      <div className="p-6 bg-white border border-gray-200 rounded-lg text-gray-500 text-center">
        No structural differences between these versions.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-gray-200 text-left text-sm text-gray-500">
            <th className="py-2 pr-3 pl-3 font-medium">Field</th>
            <th className="py-2 px-3 font-medium">Type</th>
            <th className="py-2 px-3 font-medium">Status</th>
            <th className="py-2 px-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {visibleDiffs.map((diff) => (
            <DiffRow key={diff.name} diff={diff} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
