"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";

export function MobileFilterDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 border border-hairline px-4 py-2.5 text-sm"
      >
        <SlidersHorizontal size={15} /> Filters
      </button>

      <AnimatePresence>
        {open && (
          <>
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-primary-deep/40"
            />
            <m.div
              role="dialog"
              aria-modal="true"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto bg-bg rounded-t-2xl p-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl">Filters</h2>
                <button aria-label="Close filters" onClick={() => setOpen(false)}>
                  <X size={22} />
                </button>
              </div>
              <div className="mt-6">{children}</div>
              <button
                onClick={() => setOpen(false)}
                className="mt-8 w-full bg-primary-deep text-bg py-3 text-sm"
              >
                Show results
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
