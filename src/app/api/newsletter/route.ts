import { NextResponse } from "next/server";
import { z } from "zod";
import { sendEmail, newsletterSignupEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email().max(191) });

// There is no subscriber table: a signup is emailed to ADMIN_NOTIFICATION_EMAIL
// so it isn't lost. Move to a real mailing-list provider when you outgrow this.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) {
    console.warn("ADMIN_NOTIFICATION_EMAIL not set — newsletter signup not emailed:", parsed.data.email);
    return NextResponse.json({ error: "Signups are not available right now" }, { status: 503 });
  }
  const sent = await sendEmail({
    to,
    subject: "New newsletter signup",
    html: newsletterSignupEmail(parsed.data.email),
  });
  if (!sent) return NextResponse.json({ error: "Could not record signup" }, { status: 502 });
  return NextResponse.json({ ok: true });
}
