// One-off: shrinks images that were uploaded BEFORE the browser started
// resizing them. Run on your own computer (not on cPanel) against a copy of
// the uploads folder:
//
//   npm i --no-save sharp
//   node scripts/optimize-uploads.mjs /path/to/dasdum-uploads
//
// Files keep their names and formats (so no database change is needed);
// only the pixel size and compression change. Then upload the folder back.
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node scripts/optimize-uploads.mjs <uploads-folder>");
  process.exit(1);
}

let saved = 0;
for (const name of await readdir(dir)) {
  const ext = path.extname(name).toLowerCase().slice(1);
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) continue;
  const file = path.join(dir, name);
  const before = (await stat(file)).size;
  const img = sharp(await readFile(file), { failOn: "none" }).rotate().resize({ width: 1800, height: 1800, fit: "inside", withoutEnlargement: true });
  const out =
    ext === "png" ? await img.png({ compressionLevel: 9 }).toBuffer()
    : ext === "webp" ? await img.webp({ quality: 82 }).toBuffer()
    : await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  if (out.length < before) {
    await writeFile(file, out);
    saved += before - out.length;
    console.log(`${name}: ${(before / 1024) | 0}KB → ${(out.length / 1024) | 0}KB`);
  }
}
console.log(`Saved ${(saved / 1048576).toFixed(1)}MB`);
