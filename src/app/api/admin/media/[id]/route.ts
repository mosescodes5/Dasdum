import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { deleteUpload } from "@/lib/uploads";
import { logAdminAction } from "@/lib/auth/audit";

import { clearsCache } from "@/lib/cache";
async function DELETE_handler(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAdmin("manager");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const db = await getDb();
  const row = (await db.select().from(media).where(eq(media.id, id)))[0];
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteUpload(row.storageKey);
  await db.delete(media).where(eq(media.id, id));

  await logAdminAction({ adminUserId: session.sub, action: "media.delete", entityType: "media", entityId: id });

  return NextResponse.json({ ok: true });
}

export const DELETE = clearsCache(DELETE_handler);
