// Generate RSS feed from bundled schemas
// Run: node scripts/generate-feed.mjs
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

const DIST_DIR = resolve(process.cwd(), "../dist");
const DOMAINS_DIR = join(DIST_DIR, "domains");
const BASE_URL = "https://gluendo.github.io/schema-registry";

function isDir(p) {
  try { return statSync(p).isDirectory(); } catch { return false; }
}

function listDirs(p) {
  if (!isDir(p)) return [];
  return readdirSync(p).filter((n) => isDir(join(p, n))).sort();
}

const items = [];

for (const domain of listDirs(DOMAINS_DIR)) {
  for (const entity of listDirs(join(DOMAINS_DIR, domain))) {
    for (const version of listDirs(join(DOMAINS_DIR, domain, entity))) {
      const schemaPath = join(DOMAINS_DIR, domain, entity, version, `${entity}.schema.json`);
      try {
        const raw = JSON.parse(readFileSync(schemaPath, "utf-8"));
        items.push({
          title: `${raw.title ?? entity} ${version}`,
          description: raw.description ?? "",
          link: `${BASE_URL}/domains/${domain}/${entity}/${version}`,
          domain,
          entity,
          version,
        });
      } catch { /* skip */ }
    }
  }
}

const rssItems = items
  .map(
    (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <link>${item.link}</link>
      <guid>${item.link}</guid>
      <category>${item.domain}</category>
    </item>`
  )
  .join("\n");

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Schema Registry — Gluendo</title>
    <description>Canonical JSON Schema definitions for integration platforms</description>
    <link>${BASE_URL}</link>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${rssItems}
  </channel>
</rss>
`;

mkdirSync(join(process.cwd(), "public"), { recursive: true });
writeFileSync(join(process.cwd(), "public", "feed.xml"), rss, "utf-8");
console.log(`==> Generated feed.xml with ${items.length} items`);

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
