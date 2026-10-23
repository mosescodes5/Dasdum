import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/rbac";
import { listTeam } from "@/lib/admin-team";
import { TeamManager } from "@/components/admin/TeamManager";

export const dynamic = "force-dynamic";

// Owners only. The sidebar link is a convenience; this check (and the same
// one inside every /api/admin/team route) is what actually protects it.
export default async function AdminTeamPage() {
  let session;
  try {
    session = await requireAdmin("super_admin");
  } catch {
    redirect("/admin");
  }
  const team = await listTeam();
  const me = team.find((m) => m.id === session.sub);
  return <TeamManager initialTeam={team} viewerId={session.sub} viewerIsDeveloper={me?.isDeveloper ?? false} />;
}
