import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

// A cPanel
// Node.js app is a normal long-lived Node process, so a connection pool
// created once at module load and reused across requests is the right
// model here — this is the standard way to talk to MySQL from Node.
//
// Reads DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME from the environment.
// On cPanel, create the database and a database user via "MySQL Database
// Wizard" first — cPanel prefixes both with your cPanel username, e.g.
// a database named `dasdum` and user `shop` become `cpaneluser_dasdum`
// and `cpaneluser_shop`. Set those (plus the password you chose and
// DB_HOST=localhost) as environment variables on the Node.js app in
// cPanel's "Setup Node.js App" screen, or in a git-ignored `.env` file
// loaded by your process manager.

let pool: mysql.Pool | undefined;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST ?? "localhost",
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
    });
  }
  return pool;
}

/** Returns a typed Drizzle client backed by a shared mysql2 pool. Call
 * this (with `await`, kept so existing call sites don't change) inside route handlers, server actions, and Server Components. */
export async function getDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}
