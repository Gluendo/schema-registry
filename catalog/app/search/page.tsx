import { Suspense } from "react";
import { getSearchEntries } from "@/lib/schemas";
import { SearchClient } from "./SearchClient";

export const metadata = {
  title: "Search — Schema Registry",
};

export default function SearchPage() {
  const entries = getSearchEntries();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Schemas</h1>
      <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
        <SearchClient entries={entries} />
      </Suspense>
    </div>
  );
}
