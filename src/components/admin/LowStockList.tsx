import { AlertTriangle } from "lucide-react";
import Link from "next/link";

const LOW_STOCK = [
  { name: "Calabash Pendant Light", stock: 3, sku: "DSD-CPL-01" },
  { name: "Iroko Wood Side Table", stock: 5, sku: "DSD-IST-01" },
  { name: "Osun Leather Weekender", stock: 2, sku: "DSD-OLW-COG" },
];

export function LowStockList() {
  return (
    <div className="border border-hairline bg-white p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle size={15} className="text-gold" />
        <h3 className="text-sm font-medium text-primary-deep">Low stock</h3>
      </div>
      <ul className="mt-4 divide-y divide-hairline">
        {LOW_STOCK.map((p) => (
          <li key={p.sku} className="flex items-center justify-between py-2.5 text-sm">
            <div>
              <Link href="/admin/products" className="hover:text-primary">
                {p.name}
              </Link>
              <p className="text-xs text-muted">{p.sku}</p>
            </div>
            <span className="text-xs font-medium text-red-600">{p.stock} left</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
