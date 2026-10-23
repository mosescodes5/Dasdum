"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

import { shrinkImage } from "@/lib/shrink-image";
export type UploadedMedia = { id: string; url: string; filename?: string };

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // keep in sync with src/app/api/admin/media/route.ts

/** Drag-and-drop (or click-to-browse) image uploader. Uploads immediately
 * to /api/admin/media and reports the created row back via onUploaded.
 * Renders as a dashed dropzone; pass `compact` for a smaller variant that
 * fits under an existing image preview. */
export function DropzoneUpload({
  onUploaded,
  compact = false,
  multiple = false,
}: {
  onUploaded: (item: UploadedMedia) => void;
  compact?: boolean;
  multiple?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError(null);
      setUploading(true);
      for (const file of list) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`"${file.name}" isn't a supported image type.`);
          continue;
        }
        if (file.size > MAX_SIZE_BYTES) {
          setError(`"${file.name}" is over the 8MB limit.`);
          continue;
        }
        try {
          const formData = new FormData();
          formData.append("file", await shrinkImage(file));
          const res = await fetch("/api/admin/media", { method: "POST", body: formData });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.url) {
            setError(data?.error ?? `"${file.name}" failed to upload.`);
            continue;
          }
          onUploaded({ id: data.id, url: data.url, filename: file.name });
        } catch {
          setError(`"${file.name}" failed to upload — check your connection.`);
        }
        if (!multiple) break; // single mode: stop after the first successful/attempted file
      }
      setUploading(false);
    },
    [onUploaded, multiple]
  );

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounter.current += 1;
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) setDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        aria-label="Upload image: click to browse, or drag and drop a file here"
        className={`w-full border border-dashed text-center cursor-pointer transition-colors ${
          compact ? "py-6" : "py-10"
        } ${dragging ? "border-gold bg-gold/5" : "border-hairline hover:border-gold"}`}
      >
        <UploadCloud size={compact ? 18 : 22} className="mx-auto text-muted" />
        <p className="mt-2 text-xs text-muted">
          {uploading ? "Uploading…" : dragging ? "Drop to upload" : "Drag and drop an image, or click to browse"}
        </p>
        <p className="mt-1 text-[10px] text-muted/70">JPEG, PNG, WebP, GIF or SVG — up to 8MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_TYPES.join(",")}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          disabled={uploading}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
