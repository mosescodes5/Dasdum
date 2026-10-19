/**
 * Generates a password hash compatible with src/lib/auth/password.ts,
 * for the first admin user. There's no admin signup flow by design —
 * the first account is seeded directly.
 *
 * If DB_HOST/DB_USER/DB_PASSWORD/DB_NAME are set (e.g. via a `.env` file,
 * loaded below with dotenv, or already exported in your shell), this
 * inserts the row directly. Otherwise it just prints the SQL so you can
 * paste it into phpMyAdmin's "SQL" tab yourself — useful if your hosting
 * plan doesn't give you shell/SSH access to run this script at all.
 *
 * Usage:
 *   node scripts/create-admin.mjs "owner@dasdum.co.uk" "a strong password" "Studio Owner"
 */
import "dotenv/config";
import { webcrypto as crypto } from "node:crypto";
import { randomUUID } from "node:crypto";

const ITERATIONS = 100_000;
const KEY_LENGTH = 32;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return `pbkdf2$${ITERATIONS}$${toHex(salt.buffer)}$${toHex(bits)}`;
}

const [, , email, password, name = "Admin"] = process.argv;
if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs "email" "password" ["Display Name"]');
  process.exit(1);
}

const hash = await hashPassword(password);
const id = randomUUID();
const now = new Date().toISOString();

const hasDbCreds = process.env.DB_USER && process.env.DB_NAME;

if (hasDbCreds) {
  const mysql = await import("mysql2/promise");
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST ?? "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await connection.execute(
    "INSERT INTO admin_user (id, email, password_hash, name, role, is_active, created_at) VALUES (?, ?, ?, ?, 'super_admin', 1, ?)",
    [id, email, hash, name, now]
  );
  await connection.end();
  console.log(`\nAdmin user created: ${email}`);
  console.log("Sign in at /admin/login (your production URL, or http://localhost:3000 locally).\n");
} else {
  const sql = `INSERT INTO admin_user (id, email, password_hash, name, role, is_active, created_at) VALUES ('${id}', '${email}', '${hash}', '${name}', 'super_admin', 1, '${now}');`;
  console.log("\nNo DB_USER/DB_NAME found in the environment, so nothing was inserted automatically.");
  console.log("Paste this into phpMyAdmin's \"SQL\" tab (select your database first), then Go:\n");
  console.log(`  ${sql}\n`);
  console.log("Then sign in at /admin/login (your production URL, or http://localhost:3000 locally).\n");
}
