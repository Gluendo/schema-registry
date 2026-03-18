import Link from "next/link";
import { getDependencyGraph } from "@/lib/schemas";

export const metadata = {
  title: "Dependencies — Schema Registry",
};

export default function DependenciesPage() {
  const graph = getDependencyGraph();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Dependency Graph
        </h1>
        <p className="mt-2 text-gray-600">
          Which domain schemas reference which common types. Helps answer: &ldquo;if
          I change this type, who is affected?&rdquo;
        </p>
      </div>

      {graph.length === 0 ? (
        <p className="text-gray-500">No dependencies found.</p>
      ) : (
        <div className="space-y-4">
          {graph.map((entry) => (
            <div
              key={`${entry.category}/${entry.commonType}`}
              className="p-5 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                  {entry.category}
                </span>
                <h2 className="text-lg font-semibold text-gray-900">
                  {entry.commonType}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.usedBy.map((ref) => (
                  <Link
                    key={`${ref.domain}/${ref.entity}/${ref.version}`}
                    href={ref.url}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 hover:bg-blue-100 transition-colors"
                  >
                    <span className="font-medium">{ref.entity}</span>
                    <span className="text-blue-500 text-xs">{ref.domain}</span>
                    <span className="text-blue-400 text-xs font-mono">
                      {ref.version}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
