import Link from "next/link";

const CUSTOMERS = [
  { id: "cus_1", name: "Amara Okafor", email: "amara.o@example.com", joined: "2 days ago" },
  { id: "cus_2", name: "Tayo Adeyemi", email: "tayo.a@example.com", joined: "4 days ago" },
  { id: "cus_3", name: "Ngozi Falade", email: "ngozi.f@example.com", joined: "1 week ago" },
];

export function RecentCustomersList() {
  return (
    <div className="border border-hairline bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-primary-deep">Recent customers</h3>
        <Link href="/admin/customers" className="text-xs text-primary-deep border-b border-gold">
          View all
        </Link>
      </div>
      <ul className="mt-4 divide-y divide-hairline">
        {CUSTOMERS.map((c) => (
          <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
            <div className="h-8 w-8 rounded-full bg-primary-deep text-bg flex items-center justify-center text-xs font-medium shrink-0">
              {c.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate">{c.name}</p>
              <p className="text-xs text-muted truncate">{c.email}</p>
            </div>
            <span className="text-xs text-muted shrink-0">{c.joined}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
