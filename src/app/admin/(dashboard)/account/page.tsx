import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/rbac";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/lib/admin-team-shared";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function AdminAccountPage() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  const db = await getDb();
  const me = (await db.select().from(adminUser).where(eq(adminUser.id, session.sub)))[0];
  if (!me) redirect("/admin/login");

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl text-primary-deep">My account</h1>
        <p className="mt-1 text-sm text-muted">
          {me.name} · {me.email} · {ROLE_LABELS[me.role]}
        </p>
      </div>
      <section className="border border-hairline bg-white p-5">
        <h2 className="text-sm font-medium text-primary-deep">Change password</h2>
        <p className="mb-4 mt-1 text-xs text-muted">If you were given a temporary password, change it here now.</p>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
