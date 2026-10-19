import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDeveloper } from "@/lib/auth/rbac";
import { getCategoriesWithImages, setCategoryImage } from "@/lib/db/catalog";
import { logAdminAction } from "@/lib/auth/audit";

export async function GET() {
  try {
    await requireDeveloper();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ categories: await getCategoriesWithImages() });
}

const bodySchema = z.object({ categoryId: z.string().min(1), mediaId: z.string().min(1).nullable() });

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

  await setCategoryImage(parsed.data.categoryId, parsed.data.mediaId);
  await logAdminAction({
    adminUserId: session.sub,
    action: "settings.category_image.update",
    entityType: "category",
    entityId: parsed.data.categoryId,
  });

  return NextResponse.json({ ok: true });
}
