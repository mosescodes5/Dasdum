import Link from "next/link";
import { formatMoney, toMinor } from "@/lib/currency";

// Demo figures — replace with a real query once orders are flowing (see ARCHITECTURE.md).
const ORDERS = [
  { id: "ord_1042", number: "DSD-1042", customer: "Amara Okafor", total: toMinor(229.95), status: "Delivered" },
  { id: "ord_1041", number: "DSD-1041", customer: "Tayo Adeyemi", total: toMinor(185.0), status: "Shipped" },
  { id: "ord_1040", number: "DSD-1040", customer: "Ngozi Falade", total: toMinor(58.0), status: "Processing" },
  { id: "ord_1039", number: "DSD-1039", customer: "Chidi Kalu", total: toMinor(165.0), status: "Delivered" },
  { id: "ord_1038", number: "DSD-1038", customer: "Funmi Bello", total: toMinor(42.0), status: "Cancelled" },
];

const STATUS_STYLES: Record<string, string> = {
  Delivered: "bg-green-100 text-green-700",
  Shipped: "bg-blue-100 text-blue-700",
  Processing: "bg-amber-100 text-amber-700",
  Cancelled: "bg-red-100 text-red-700",
};

export function RecentOrdersTable() {
  return (
    <div className="border border-hairline bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-primary-deep">Recent orders</h3>
        <Link href="/admin/orders" className="text-xs text-primary-deep border-b border-gold">
          View all
        </Link>
      </div>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-hairline">
            <th className="pb-2 font-normal">Order</th>
            <th className="pb-2 font-normal">Customer</th>
            <th className="pb-2 font-normal">Status</th>
            <th className="pb-2 font-normal text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {ORDERS.map((o) => (
            <tr key={o.id} className="border-b border-hairline last:border-0">
              <td className="py-2.5">
                <Link href={`/admin/orders/${o.id}`} className="hover:text-primary">
                  {o.number}
                </Link>
              </td>
              <td className="py-2.5">{o.customer}</td>
              <td className="py-2.5">
                <span className={`px-2 py-0.5 text-xs rounded-sm ${STATUS_STYLES[o.status]}`}>{o.status}</span>
              </td>
              <td className="py-2.5 text-right">{formatMoney(o.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
