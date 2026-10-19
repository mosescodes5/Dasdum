"use client";

import { useState } from "react";

// `images` is the featured image plus the product_image gallery rows, in
// admin-set order (see src/lib/db/catalog.ts and the product edit page's
// Gallery section). Falls back to placeholder swatches when empty, so
// products without a photo yet still render a working gallery.
export function ImageGallery({ images = [], count = 4 }: { images?: string[]; count?: number }) {
  const [active, setActive] = useState(0);
  const hasRealImages = images.length > 0;
  const slots = hasRealImages ? images : Array.from({ length: count }).map(() => null);

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4">
      <div className="flex sm:flex-col gap-3">
        {slots.map((src, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            aria-current={active === i}
            className={`h-16 w-16 shrink-0 overflow-hidden bg-primary/15 border transition-colors ${
              active === i ? "border-gold" : "border-transparent hover:border-hairline"
            }`}
          >
            {src && (
              // eslint-disable-next-line @next/next/no-img-element -- same-origin /media/ URL from local uploads
              <img src={src} alt="" className="h-full w-full object-cover" />
            )}
          </button>
        ))}
      </div>

      <div className="relative flex-1 aspect-square overflow-hidden bg-primary/10 group">
        {hasRealImages ? (
          // eslint-disable-next-line @next/next/no-img-element -- same-origin /media/ URL from local uploads
          <img
            src={slots[active] as string}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-editorial group-hover:scale-110"
            style={{ cursor: "zoom-in" }}
          />
        ) : (
          <div className="absolute inset-0 bg-soft2" />
        )}
      </div>
    </div>
  );
}
