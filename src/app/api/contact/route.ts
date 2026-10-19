import { NextResponse } from "next/server";
import { contactSchema } from "@/lib/validation/contact";
import { sendEmail, contactNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as any;
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (to) {
    await sendEmail({
      to,
      subject: `Contact form: ${parsed.data.subject}`,
      html: contactNotificationEmail(parsed.data),
    });
  } else {
    // Nowhere configured to send it — at least keep it in the server log
    // rather than silently discarding the person's message.
    console.warn("ADMIN_NOTIFICATION_EMAIL not set — contact submission not emailed:", parsed.data);
  }

  return NextResponse.json({ ok: true });
}
