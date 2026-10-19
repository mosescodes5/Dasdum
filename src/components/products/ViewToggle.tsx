"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List } from "lucide-react";

export function ViewToggle() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "list" ? "list" : "grid";

  function setView(next: "grid" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "grid") params.delete("view");
    else params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="hidden sm:flex items-center gap-1 border border-hairline">
      <button
        aria-label="Grid view"
        aria-pressed={view === "grid"}
        onClick={() => setView("grid")}
        className={`p-2 ${view === "grid" ? "bg-primary-deep text-bg" : "text-primary-deep"}`}
      >
        <LayoutGrid size={16} />
      </button>
      <button
        aria-label="List view"
        aria-pressed={view === "list"}
        onClick={() => setView("list")}
        className={`p-2 ${view === "list" ? "bg-primary-deep text-bg" : "text-primary-deep"}`}
      >
        <List size={16} />
      </button>
    </div>
  );
}
