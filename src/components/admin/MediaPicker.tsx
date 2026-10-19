"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type MediaItem = { id: string; url: string; filename: string };

export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
}) {
  const [items, setItems] = useState<MediaItem[] | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((data: any) => setItems(data.media))
      .catch(() => setItems([]));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-deep/50 p-4">
      <div className="bg-bg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-hairline sticky top-0 bg-bg">
          <h2 className="font-display text-lg">Select an image</h2>
          <button onClick={onClose} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-4">
          {items === null ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted">
              No media uploaded yet — visit the Media Library to upload an image first.
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  className="border border-hairline hover:border-gold"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.filename} className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
