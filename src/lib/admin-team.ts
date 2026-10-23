import { asc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminUser } from "@/lib/db/schema";
import { isDeveloperEmail } from "@/lib/auth/rbac";
import type { TeamMember } from "@/lib/admin-team-shared";

export async function listTeam(): Promise<TeamMember[]> {
  const db = await getDb();
  const rows = await db.select().from(adminUser).orderBy(asc(adminUser.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    isActive: r.isActive,
    createdAt: String(r.createdAt),
    isDeveloper: isDeveloperEmail(r.email),
  }));
}
