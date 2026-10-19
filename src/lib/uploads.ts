import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

// Files are stored on local disk rather than R2 — a cPanel Node.js app is
// a normal Node process with a writable filesystem, so there's no need
// for external object storage.
//
// UPLOADS_DIR should be an ABSOLUTE path OUTSIDE your Node.js app's
// "Application root" / the Next.js build output (e.g.
// /home/<cpaneluser>/dasdum-uploads). Keeping it outside the app root
// means redeploying (re-uploading a fresh build) never touches or wipes
// previously uploaded files. Falls back to ./uploads for local dev.

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

export function buildMediaKey(filename: string): string {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  return `${crypto.randomUUID()}.${ext}`;
}

/** Saves a file to local disk and returns its public URL, served via
 * src/app/media/[...path]/route.ts. */
export async function saveUpload(key: string, file: ArrayBuffer): Promise<string> {
  const dir = getUploadsDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), Buffer.from(file));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dasdum.co.uk";
  return `${siteUrl}/media/${key}`;
}

export async function deleteUpload(key: string): Promise<void> {
  try {
    await unlink(path.join(getUploadsDir(), key));
  } catch {
    // already gone — fine, the DB row is the source of truth for "delete succeeded"
  }
}
