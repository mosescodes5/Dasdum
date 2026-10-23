import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { media } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/rbac";
import { saveUpload, buildMediaKey } from "@/lib/uploads";
import { logAdminAction } from "@/lib/auth/audit";

import { clearsCache } from "@/lib/cache";
const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = await getDb();
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  return NextResponse.json({ media: rows });
}

async function POST_handler(request: Request) {
  let session;
  try {
    session = await requireAdmin("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File is too large (8MB max)." }, { status: 400 });
  }

  const key = buildMediaKey(file.name);
  const url = await saveUpload(key, await file.arrayBuffer());

  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(media).values({
    id,
    storageKey: key,
    url,
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedBy: session.sub,
    createdAt: new Date().toISOString(),
  });

  await logAdminAction({ adminUserId: session.sub, action: "media.upload", entityType: "media", entityId: id });

  return NextResponse.json({ ok: true, id, url });
}

export const POST = clearsCache(POST_handler);
