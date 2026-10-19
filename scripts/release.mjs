#!/usr/bin/env node
/**
 * One command from source code to an upload-ready zip:
 *
 *   npm run release            install + build + deploy folder + zip
 *   npm run release -- --fast  same, but skip the install if node_modules exists
 *
 * Works on Windows, macOS and Linux (plain Node — no bash, rsync or zip needed).
 * Run it on your own computer, never on the server.
 *
 * It stops with a plain-English message if something is wrong, BEFORE the
 * slow steps where it can (missing settings, wrong Node version).
 */
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { ZipArchive } from "archiver";
import dotenv from "dotenv";

const args = new Set(process.argv.slice(2));
const FAST = args.has("--fast");
const ALLOW_LOCAL = args.has("--allow-local"); // only for a rehearsal build on your own PC

const c = { b: (s) => `\x1b[1m${s}\x1b[0m`, g: (s) => `\x1b[32m${s}\x1b[0m`, y: (s) => `\x1b[33m${s}\x1b[0m`, r: (s) => `\x1b[31m${s}\x1b[0m` };
const step = (n, text) => console.log(`\n${c.b(`[${n}/5]`)} ${c.b(text)}`);
function fail(message) {
  console.error(`\n${c.r("✖ Release stopped:")} ${message}\n`);
  process.exit(1);
}

// ---- 0. Cheap checks first (so you don't wait 2 minutes to hear about them)
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) fail(`Node ${process.versions.node} is too old. Install Node 20 or newer from nodejs.org, then try again.`);
if (!existsSync("package.json") || !existsSync("scripts/prepare-deploy.mjs")) fail("Run this from the project folder (the one containing package.json).");

if (!existsSync(".env")) {
  fail("There's no .env file. Copy .env.example to .env and fill it in first — the build bakes these settings into the site.");
}
for (const stray of ["apps", "packages"]) {
  if (existsSync(stray)) {
    console.log(c.y(`⚠ Found a "${stray}" folder. That isn't part of the DASDUM shop (it looks like a different project). It's ignored by the build, but it's safer to move it out of this folder.`));
  }
}
const env = { ...dotenv.parse(readFileSync(".env")), ...process.env }; // real environment wins, same as Next.js
const missing = ["NEXT_PUBLIC_CURRENCY", "NEXT_PUBLIC_SHIPPING_STANDARD", "NEXT_PUBLIC_SHIPPING_EXPRESS", "NEXT_PUBLIC_SITE_URL"].filter(
  (k) => !env[k]?.trim()
);
if (missing.length) fail(`These lines in .env are empty or missing: ${missing.join(", ")}\n  (They're baked into the build, so they must be right BEFORE it runs.)`);

const siteUrl = env.NEXT_PUBLIC_SITE_URL.trim();
if (!/^https:\/\//.test(siteUrl) && !(ALLOW_LOCAL && /^http:\/\/localhost/.test(siteUrl))) {
  fail(`NEXT_PUBLIC_SITE_URL is "${siteUrl}". For a real release it must be your live address, starting with https:// (e.g. https://dasdum.co.uk). Stripe sends customers back to this address.`);
}
if (/localhost|example\./.test(siteUrl) && !ALLOW_LOCAL) fail(`NEXT_PUBLIC_SITE_URL ("${siteUrl}") looks like a placeholder. Set it to your live domain.`);
console.log(`${c.g("✔")} Settings look good. Building for ${c.b(siteUrl)} (${env.NEXT_PUBLIC_CURRENCY})`);

function run(command) {
  return new Promise((resolve, reject) => {
    // One string + shell:true so `npm` resolves on Windows (npm.cmd) too.
    const child = spawn(command, { stdio: "inherit", shell: true, env: process.env });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`"${command}" failed with exit code ${code}`))));
    child.on("error", reject);
  });
}

try {
  // ---- 1. Install
  step(1, "Installing dependencies");
  if (FAST && existsSync("node_modules")) console.log("Skipped (--fast and node_modules already exists).");
  else await run(existsSync("package-lock.json") ? "npm ci" : "npm install");

  // ---- 2. Build
  step(2, "Building the site (this takes a minute or two)");
  // Always build from a clean slate: a leftover .next folder from an old
  // `npm run dev` (or an older version of the project) makes the type-check
  // fail on pages that no longer exist. Retries because OneDrive/antivirus
  // can briefly lock files on Windows.
  rmSync(".next", { recursive: true, force: true, maxRetries: 5, retryDelay: 400 });
  await run("npm run build");

  // ---- 3. Assemble the deploy folder
  step(3, "Assembling the deploy folder");
  await run("node scripts/prepare-deploy.mjs");
} catch (err) {
  fail(`${err.message}\n  Scroll up for the first red error — that's the real cause. You can paste it into Copilot Chat and ask it to fix it.`);
}

// Safety: secrets must never travel inside the upload.
for (const name of readdirSync("deploy")) {
  if (name.startsWith(".env")) {
    rmSync(join("deploy", name), { force: true });
    console.log(c.y(`Removed ${name} from the deploy folder (secrets belong on the server, not in the upload).`));
  }
}
for (const required of ["app.js", "server.js", ".next/static", "public"]) {
  if (!existsSync(join("deploy", required))) fail(`The deploy folder is missing "${required}" — the build didn't finish properly.`);
}

// ---- 4. Zip
step(4, "Zipping");
mkdirSync("release", { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const zipPath = join("release", `dasdum-deploy-${stamp}.zip`);
const names = [];
await new Promise((resolve, reject) => {
  const out = createWriteStream(zipPath);
  const zip = new ZipArchive({ zlib: { level: 9 } });
  out.on("close", resolve);
  zip.on("error", reject);
  zip.on("entry", (e) => names.push(e.name));
  zip.pipe(out);
  zip.directory("deploy", false); // the CONTENTS of deploy/, hidden .next folder included
  zip.finalize();
}).catch((err) => fail(`Couldn't create the zip: ${err.message}`));

if (!names.includes("app.js") || !names.some((n) => n.startsWith(".next/static"))) {
  fail("The zip was created but is missing app.js or .next/static — don't upload it.");
}

// Keep only the 5 most recent zips so this folder doesn't grow forever.
const old = readdirSync("release").filter((f) => f.endsWith(".zip")).sort().reverse().slice(5);
for (const f of old) rmSync(join("release", f), { force: true });

// ---- 5. Done
step(5, "Done");
const mb = (statSync(zipPath).size / 1048576).toFixed(1);
console.log(`
${c.g("✔ Release ready:")} ${c.b(zipPath)}  (${mb} MB, ${names.length} files)

Next, in cPanel:
  1. File Manager → open your app folder (the Node.js app's "Application root").
  2. Upload this zip, then Extract it over the old files.
     (Leave your .env file and your uploads folder alone.)
  3. Setup Node.js App → Restart.
  4. If this release changed the database, run the SQL from the notes first.
`);
