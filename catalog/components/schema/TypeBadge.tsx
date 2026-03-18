const typeColors: Record<string, string> = {
  string: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  number: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  integer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  boolean: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  object: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  array: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  "array<object>": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  enum: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

export function TypeBadge({ type }: { type: string }) {
  const color = typeColors[type] ?? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {type}
    </span>
  );
}
