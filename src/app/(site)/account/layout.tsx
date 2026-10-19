import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AccountNav } from "@/components/account/AccountNav";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  // Server-side check on every request to this layout — this is the actual
  // authorization boundary, not just a client-side redirect.
  const session = await getSession("customer");
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container-editorial py-12">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <aside>
          <AccountNav />
        </aside>
        <div>{children}</div>
      </div>
    </div>
  );
}
