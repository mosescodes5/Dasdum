const MAX_EDGE = 1800; // px — plenty for a full-width banner, far smaller than a phone photo

/** Shrinks big photos in the browser before they are uploaded: longest side
 * capped at 1800px and re-encoded as WebP. A 5MB phone photo becomes a few
 * hundred KB, which is the biggest single win for how fast the shop loads.
 * GIFs/SVGs are left alone, and if anything goes wrong (or the result isn't
 * smaller) the original file is uploaded unchanged. */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 300 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

