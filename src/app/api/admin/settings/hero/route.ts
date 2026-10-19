import { NextResponse } from "next/server";
import { requireDeveloper } from "@/lib/auth/rbac";
import { getHeroContent, setHeroContent } from "@/lib/db/catalog";
import { heroContentSchema } from "@/lib/validation/admin-hero";
import { logAdminAction } from "@/lib/auth/audit";

// Developer-only, not just any admin/editor — see requireDeveloper's own
// comment for why this one screen is gated differently from the rest of
// the dashboard.
export async function GET() {
  try {
    await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ hero: await getHeroContent() });
}

export async function PUT(request: Request) {
  let session;
  try {
    session = await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as any;
  const parsed = heroContentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await setHeroContent(parsed.data);

  await logAdminAction({
    adminUserId: session.sub,
    action: "settings.hero.update",
    entityType: "site_setting",
  });

  return NextResponse.json({ ok: true });
}
