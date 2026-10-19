import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function POST() {
  await clearSession("admin");
  return NextResponse.json({ ok: true });
}
