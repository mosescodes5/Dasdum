// Safe to import from browser code: no database, no server-only imports.
// (The server-only part — listTeam — lives in admin-team.ts.)

export type TeamRole = "super_admin" | "manager" | "editor" | "support";

export const ROLE_LABELS: Record<TeamRole, string> = {
  super_admin: "Owner",
  manager: "Manager",
  editor: "Editor",
  support: "Support",
};

// Matches what the API routes actually enforce (requireAdmin(...) calls).
export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  super_admin: "Everything a Manager can do, plus managing the team.",
  manager: "Everything an Editor can do, plus deleting products, categories, posts and images, and disabling customer accounts.",
  editor: "Everything Support can do, plus adding and editing products, categories and blog posts, and uploading images.",
  support: "Views orders, customers and products, and updates order fulfilment status.",
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  isActive: boolean;
  createdAt: string;
  /** The account matching DEVELOPER_EMAIL — protected from everyone else. */
  isDeveloper: boolean;
};

type Decision = { ok: true } | { ok: false; status: number; message: string };

/** Who may change whom. Pure (no database) so every rule can be tested.
 *
 *  - Only an Owner (super_admin) can manage the team at all.
 *  - The developer account is untouchable by anyone else.
 *  - Nobody can demote, disable or reset themselves (no lock-outs); use
 *    "My account" to change your own password.
 *  - Only the developer can create, change or disable another Owner.
 *  - The last active Owner can never be removed. */
export function checkTeamChange(p: {
  viewer: { id: string; role: TeamRole; isDeveloper: boolean };
  target: { id: string; role: TeamRole; isActive: boolean; isDeveloper: boolean };
  change: { role?: TeamRole; isActive?: boolean; resetPassword?: boolean };
  /** Active Owners other than the target. */
  otherActiveOwners: number;
}): Decision {
  const { viewer, target, change } = p;
  const deny = (status: number, message: string): Decision => ({ ok: false, status, message });

  if (viewer.role !== "super_admin") return deny(403, "Only an Owner can manage the team.");
  if (target.isDeveloper && !viewer.isDeveloper) return deny(403, "The developer account is protected.");

  const changesRole = change.role !== undefined && change.role !== target.role;
  const disables = change.isActive === false && target.isActive;
  const isSelf = viewer.id === target.id;

  if (isSelf) {
    if (changesRole) return deny(400, "You can't change your own role.");
    if (disables) return deny(400, "You can't disable your own account.");
    if (change.resetPassword) return deny(400, "Change your own password under My account.");
  }

  if (target.role === "super_admin" && !viewer.isDeveloper && !isSelf && (changesRole || disables || change.resetPassword)) {
    return deny(403, "Only the developer account can change another Owner.");
  }
  if (change.role === "super_admin" && target.role !== "super_admin" && !viewer.isDeveloper) {
    return deny(403, "Only the developer account can make someone an Owner.");
  }

  const losesOwner = target.role === "super_admin" && target.isActive && ((changesRole && change.role !== "super_admin") || disables);
  if (losesOwner && p.otherActiveOwners < 1) return deny(409, "There must always be at least one active Owner.");

  return { ok: true };
}
