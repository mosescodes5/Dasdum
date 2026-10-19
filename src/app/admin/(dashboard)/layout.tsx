import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { isDeveloperEmail } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";

// Every admin page depends on this layout's session check — cookies() usage
// already forces dynamic rendering implicitly, but this is explicit for
// clarity, and covers every page nested under this layout at once.
export const dynamic = "force-dynamic";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side check on every request — the actual authorization boundary.
  // middleware.ts only redirects based on cookie *presence* for fast UX.
  const session = await getSession("admin");
  if (!session || session.role !== "admin") {
    redirect("/admin/login");
  }

  const db = await getDb();
  const admin = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  if (!admin || !admin.isActive) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen bg-bg font-ui">
      <AdminSidebar
        showSiteImages={isDeveloperEmail(admin.email)}
        showSiteContent={isDeveloperEmail(admin.email)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminTopbar adminName={admin.name} role={admin.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
