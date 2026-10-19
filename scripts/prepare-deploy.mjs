/**
 * Assembles a ready-to-upload folder (./deploy) from a finished
 * `npm run build`. Next's standalone output doesn't include public/ or
 * .next/static, so they have to be copied in by hand — this does it.
 *
 * Usage (on your own computer, not the server):
 *   NEXT_PUBLIC_SITE_URL=https://dasdum.co.uk npm run build
 *   node scripts/prepare-deploy.mjs
 * then zip the contents of ./deploy and upload/extract it into your
 * cPanel Node.js app's "Application root". See README.md.
 */
import { cpSync, existsSync, rmSync, writeFileSync, mkdirSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(`${standalone}/server.js`)) {
  console.error("No .next/standalone/server.js found — run `npm run build` first.");
  process.exit(1);
}

rmSync("deploy", { recursive: true, force: true });
cpSync(standalone, "deploy", { recursive: true });
mkdirSync("deploy/.next", { recursive: true });
cpSync(".next/static", "deploy/.next/static", { recursive: true });
if (existsSync("public")) cpSync("public", "deploy/public", { recursive: true });

// Startup wrapper for cPanel/Passenger: loads a .env file that sits next to
// it (if you prefer that to cPanel's environment-variable screen), then
// starts Next's generated server. Set "Application startup file" to app.js.
writeFileSync(
  "deploy/app.js",
  `// Loads ./.env if present, then starts the Next.js standalone server.
const fs = require("fs");
const path = require("path");
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\\r?\\n/)) {
    const m = line.match(/^\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)\\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
require("./server.js");
`
);

console.log("Done. Upload the contents of ./deploy to your cPanel app root, startup file: app.js");
