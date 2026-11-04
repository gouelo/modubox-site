// Bakes the catalog changes published in the admin (/admin/catalog: tables
// catalog_products and catalog_addons, their `published` column) into
// data/catalog-overrides.json before `next build`, so the pages, the cart in
// the browser and the server's checkout pricing all read the same prices
// (src/lib/catalog.ts applies the file on top of data/products.json and
// data/addons.json).
//
// On Vercel with a database only (after scripts/migrate.mjs). If the database
// can't be read, the build fails and Vercel keeps the previous deployment live:
// never a site that silently falls back to old prices. Without a database (the
// GitHub Pages build, a local build) the file stays as committed: no changes.
//
// Run by hand: CATALOG_SYNC=1 DATABASE_URL=… node scripts/catalog-sync.mjs
import fs from "node:fs";
import pg from "pg";

const e = process.env;
const url = (e.DATABASE_URL_UNPOOLED || e.DATABASE_POSTGRES_URL_NON_POOLING || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL || e.DATABASE_POSTGRES_URL || e.POSTGRES_URL || "").trim();
const enabled = e.VERCEL === "1" || e.CATALOG_SYNC === "1";
const FILE = "data/catalog-overrides.json";

if (!url || !enabled) {
  console.log(`[catalog] skipped (${url ? "not on Vercel; CATALOG_SYNC=1 to run" : "no DATABASE_URL"})`);
} else {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const products = await client.query("select slug, copied_from, published from catalog_products where published is not null order by slug");
    const addons = await client.query("select id, published from catalog_addons where published is not null order by id");
    const out = {
      _readme: JSON.parse(fs.readFileSync(FILE, "utf8"))._readme,
      generatedAt: new Date().toISOString(),
      products: Object.fromEntries(products.rows.map((r) => [r.slug, { ...r.published, ...(r.copied_from ? { copiedFrom: r.copied_from } : {}) }])),
      addons: Object.fromEntries(addons.rows.map((r) => [r.id, r.published])),
    };
    fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
    console.log(`[catalog] ${products.rows.length} product and ${addons.rows.length} add-on changes baked in`);
  } finally {
    await client.end();
  }
}
