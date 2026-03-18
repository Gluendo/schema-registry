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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Dependency Graph
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Which domain schemas reference which common types. Helps answer: &ldquo;if
          I change this type, who is affected?&rdquo;
        </p>
      </div>

      {graph.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No dependencies found.</p>
      ) : (
        <div className="space-y-4">
          {graph.map((entry) => (
            <div
              key={`${entry.category}/${entry.commonType}`}
              className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded text-xs">
                  {entry.category}
                </span>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {entry.commonType}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {entry.usedBy.map((ref) => (
                  <Link
                    key={`${ref.domain}/${ref.entity}/${ref.version}`}
                    href={ref.url}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md text-sm text-blue-800 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    <span className="font-medium">{ref.entity}</span>
                    <span className="text-blue-500 dark:text-blue-400 text-xs">{ref.domain}</span>
                    <span className="text-blue-400 dark:text-blue-500 text-xs font-mono">
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
