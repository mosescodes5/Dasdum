import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { customer } from "@/lib/db/schema";
import { ProfileForm } from "@/components/account/ProfileForm";

// Reads the session cookie and live customer data — cookies() usage already
// forces dynamic rendering implicitly, but this is explicit for clarity.
export const dynamic = "force-dynamic";

export default async function AccountProfilePage() {
  const session = await getSession("customer"); // layout already guarantees this exists
  const db = await getDb();
  const user = (await db.select().from(customer).where(eq(customer.id, session!.sub)))[0];

  if (!user) {
    return <p className="text-sm text-muted">We couldn&rsquo;t find your account details.</p>;
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-primary-deep">
        Hello, {user.firstName}
      </h1>
      <p className="mt-2 text-sm text-muted">Manage your profile details.</p>
      <ProfileForm
        initial={{
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        }}
      />
    </div>
  );
}
