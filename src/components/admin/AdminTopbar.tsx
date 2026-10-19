"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminTopbar({ adminName, role }: { adminName: string; role: string }) {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-end gap-4 border-b border-hairline bg-white px-6 py-3.5">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-sm">
          <div className="h-8 w-8 rounded-full bg-primary-deep text-bg flex items-center justify-center text-xs font-medium">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="font-medium">{adminName}</p>
            <p className="text-xs text-muted capitalize">{role.replace("_", " ")}</p>
          </div>
        </div>
        <button aria-label="Sign out" onClick={signOut} className="text-muted hover:text-text">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
