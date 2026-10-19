"use client";

import { useState } from "react";
import Link from "next/link";

const TABS = ["Details", "Shipping & Returns"] as const;

// There is no review system yet (no `review` table), so there is no
// Reviews tab — it used to show two made-up reviews on every product.
export function ProductTabs({ description }: { description?: string | null }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Details");

  return (
    <div className="mt-16">
      <div className="flex gap-8 border-b border-hairline">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t}
            className={`pb-3 text-sm -mb-px border-b-2 transition-colors ${
              tab === t ? "border-gold text-primary-deep" : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="py-8 max-w-2xl text-sm leading-relaxed text-muted">
        {tab === "Details" && (
          <p className="whitespace-pre-line">{description || "More details about this piece are coming soon."}</p>
        )}

        {tab === "Shipping & Returns" && (
          <div className="space-y-3">
            <p>See our <Link href="/faq#shipping" className="text-primary-deep link-underline">FAQ</Link> for delivery times and our returns policy.</p>
          </div>
        )}
      </div>
    </div>
  );
}
