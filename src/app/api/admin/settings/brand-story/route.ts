import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDeveloper } from "@/lib/auth/rbac";
import { getBrandStoryImageUrl, setBrandStoryImageUrl } from "@/lib/db/catalog";
import { logAdminAction } from "@/lib/auth/audit";

export async function GET() {
  try {
    await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ imageUrl: await getBrandStoryImageUrl() });
}

const bodySchema = z.object({ imageUrl: z.string().url().nullable() });

export async function PUT(request: Request) {
  let session;
  try {
    session = await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await setBrandStoryImageUrl(parsed.data.imageUrl);
  await logAdminAction({ adminUserId: session.sub, action: "settings.brand_story.update", entityType: "site_setting" });

  return NextResponse.json({ ok: true });
}
