import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { address } from "@/lib/db/schema";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession("customer");
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const db = await getDb();
  const rows = await db.select().from(address).where(eq(address.customerId, session.sub));
  return NextResponse.json({ addresses: rows });
}

export async function POST(request: Request) {
  const session = await getSession("customer");
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as any;
  const required = ["fullName", "line1", "city", "state", "postalCode"] as const;
  for (const field of required) {
    if (!body?.[field]) {
      return NextResponse.json({ error: `${field} is required.` }, { status: 400 });
    }
  }

  const db = await getDb();
  await db.insert(address).values({
    id: crypto.randomUUID(),
    customerId: session.sub,
    label: body.label ?? null,
    fullName: body.fullName,
    line1: body.line1,
    line2: body.line2 ?? null,
    city: body.city,
    state: body.state,
    postalCode: body.postalCode,
    country: body.country ?? "GB",
    phone: body.phone ?? null,
    isDefault: false,
  });

  return NextResponse.json({ ok: true });
}
