import type { NextConfig } from "next";
import path from "node:path";

// Fail fast (build and dev) if the money settings are missing, instead of
// shipping a store that crashes when it first tries to show a price.
for (const name of [
  "NEXT_PUBLIC_CURRENCY",
  "NEXT_PUBLIC_SHIPPING_STANDARD",
  "NEXT_PUBLIC_SHIPPING_EXPRESS",
]) {
  if (!process.env[name]?.trim()) {
    throw new Error(`${name} is not set. Copy .env.example to .env and fill it in before building.`);
  }
}

const nextConfig: NextConfig = {
  // Pins the project root explicitly. Without this, Next/Turbopack can get
  // confused if it finds another lockfile higher up the filesystem (common
  // on Windows machines with OneDrive-synced home folders) and emit a
  // "ignored package-lock.json in <home dir>" warning.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Bundles a minimal, self-contained server (.next/standalone) that
  // needs only its own copied-in node_modules subset to run — no `next`
  // CLI or full node_modules required at runtime. This is what cPanel's
  // "Setup Node.js App" (Passenger) runs directly: point its Application
  // startup file at .next/standalone/server.js. See README.md for the
  // full deploy steps (copying public/ and .next/static into place).
  output: "standalone",

  images: {
    // Next's built-in image optimizer needs `sharp`'s native bindings,
    // which aren't reliably available on shared cPanel hosting. Serving
    // unoptimized images is the safe default.
    unoptimized: true,
  },
};

export default nextConfig;
