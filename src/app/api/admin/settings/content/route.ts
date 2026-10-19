import { NextResponse } from "next/server";
import { requireDeveloper } from "@/lib/auth/rbac";
import { getSiteContent, setSiteContent } from "@/lib/site-content";
import { siteContentSchema } from "@/lib/validation/admin-site-content";
import { logAdminAction } from "@/lib/auth/audit";

// Developer-only, same as Site Images: only the admin account whose email
// matches DEVELOPER_EMAIL can read or change the site's page copy.
export async function GET() {
  try {
    await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ content: await getSiteContent() });
}

export async function PUT(request: Request) {
  let session;
  try {
    session = await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = siteContentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await setSiteContent(parsed.data);
  await logAdminAction({ adminUserId: session.sub, action: "settings.content.update", entityType: "site_setting" });
  return NextResponse.json({ ok: true });
}
