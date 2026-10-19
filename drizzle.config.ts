import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// `drizzle-kit generate` reads schema + out to produce SQL migration
// files, and doesn't need a live connection for that. `drizzle-kit push`
// (handy if you have SSH/terminal access on cPanel and want to sync the
// schema straight to a live database without hand-running SQL) does need
// dbCredentials, pulled here from your .env file.
//
// If you don't have shell access on your hosting plan, ignore push/
// migrate entirely — just import db/dasdum_mysql_schema.sql via
// phpMyAdmin once, and use `db:generate` later only if you change
// src/lib/db/schema.ts and want a matching .sql diff to run by hand.
export default defineConfig({
  dialect: "mysql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    host: process.env.DB_HOST ?? "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER ?? "",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "",
  },
});
