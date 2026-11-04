// Runs the database migrations (drizzle/*.sql) before `next build`, on Vercel,
// when a database is connected. Each migration runs once: Drizzle records the
// ones it ran in the database (drizzle.__drizzle_migrations).
//
// Without a database (the GitHub Pages build, a Vercel project before Neon is
// connected) it does nothing. If a migration fails, the build fails and Vercel
// keeps the previous deployment live.
//
// Run by hand: MIGRATE=1 DATABASE_URL=… node scripts/migrate.mjs
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

// the direct (unpooled) connection first; Neon's names, with or without the DATABASE prefix
const e = process.env;
const url = (e.DATABASE_URL_UNPOOLED || e.DATABASE_POSTGRES_URL_NON_POOLING || e.POSTGRES_URL_NON_POOLING || e.DATABASE_URL || e.DATABASE_POSTGRES_URL || e.POSTGRES_URL || "").trim();
const enabled = process.env.VERCEL === "1" || process.env.MIGRATE === "1";

if (!url || !enabled) {
  console.log(`[migrate] skipped (${url ? "not on Vercel; MIGRATE=1 to run" : "no DATABASE_URL"})`);
} else {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("[migrate] database is up to date");
  } finally {
    await pool.end();
  }
}
