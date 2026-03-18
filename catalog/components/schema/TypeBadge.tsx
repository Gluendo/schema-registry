const typeColors: Record<string, string> = {
  string: "bg-blue-100 text-blue-800",
  number: "bg-green-100 text-green-800",
  integer: "bg-green-100 text-green-800",
  boolean: "bg-purple-100 text-purple-800",
  object: "bg-orange-100 text-orange-800",
  array: "bg-teal-100 text-teal-800",
  "array<object>": "bg-teal-100 text-teal-800",
  enum: "bg-yellow-100 text-yellow-800",
};

export function TypeBadge({ type }: { type: string }) {
  const color = typeColors[type] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${color}`}>
      {type}
    </span>
  );
}
