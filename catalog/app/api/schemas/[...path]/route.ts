import { NextResponse } from "next/server";
import { getRawSchema, getAllSchemas } from "@/lib/schemas";

export function generateStaticParams() {
  return getAllSchemas().map((s) => ({
    path: [
      "domains",
      s.domain,
      s.entity,
      s.version,
      `${s.entity}.schema.json`,
    ],
  }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const schemaPath = path.join("/");
  const schema = getRawSchema(schemaPath);

  if (!schema) {
    return NextResponse.json({ error: "Schema not found" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(schema, null, 2), {
    headers: {
      "Content-Type": "application/schema+json",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
