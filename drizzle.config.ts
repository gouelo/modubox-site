import { defineConfig } from "drizzle-kit";

// `npm run db:generate` writes a migration under drizzle/ from src/db/schema.ts.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.DATABASE_POSTGRES_URL || "" },
});
