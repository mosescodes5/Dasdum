"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Trash2 } from "lucide-react";
import { DropzoneUpload } from "@/components/admin/DropzoneUpload";

type MediaItem = { id: string; url: string; filename: string; mimeType: string; sizeBytes: number; createdAt: string };

export function MediaLibrary() {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/media");
    if (res.ok) {
      const data = (await res.json()) as any;
      setItems(data.media);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Delete this file? Anything using it will show a broken image.")) return;
    await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    load();
  }

  function copyUrl(item: MediaItem) {
    navigator.clipboard.writeText(item.url).then(() => {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  const filtered = (items ?? []).filter((i) => i.filename.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search files…"
        className="border border-hairline px-3 py-2 text-sm w-full max-w-xs"
      />

      <div className="mt-4">
        <DropzoneUpload multiple onUploaded={() => load()} />
      </div>

      {items === null ? (
        <p className="mt-8 text-sm text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 border border-dashed border-hairline p-12 text-center text-sm text-muted">
          No files yet — upload an image to get started.
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="border border-hairline bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt={item.filename} className="aspect-square w-full object-cover bg-primary/10" />
              <div className="p-2">
                <p className="truncate text-xs">{item.filename}</p>
                <p className="text-[10px] text-muted">{(item.sizeBytes / 1024).toFixed(0)} KB</p>
                <div className="mt-1.5 flex gap-2">
                  <button onClick={() => copyUrl(item)} aria-label="Copy URL" className="text-muted hover:text-text">
                    <Copy size={13} />
                  </button>
                  <button onClick={() => remove(item.id)} aria-label="Delete" className="text-muted hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                  {copiedId === item.id && <span className="text-[10px] text-green-700">Copied</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
