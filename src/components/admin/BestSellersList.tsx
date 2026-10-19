import { formatMoney, toMinor } from "@/lib/currency";

// Demo figures — replace with a real query once orders are flowing (see ARCHITECTURE.md).
const PRODUCTS = [
  { name: "Lagos Market Tote", sold: 103, revenue: toMinor(432.6) },
  { name: "Adire Stoneware Set (4pc)", sold: 62, revenue: toMinor(527.0) },
  { name: "Harmattan Cotton Throw", sold: 54, revenue: toMinor(313.2) },
  { name: "Nomad Leather Crossbody", sold: 45, revenue: toMinor(351.0) },
];

export function BestSellersList() {
  return (
    <div className="border border-hairline bg-white p-5">
      <h3 className="text-sm font-medium text-primary-deep">Best selling products</h3>
      <ul className="mt-4 divide-y divide-hairline">
        {PRODUCTS.map((p) => (
          <li key={p.name} className="flex items-center gap-3 py-2.5 text-sm">
            <div className="h-9 w-9 shrink-0 bg-primary/15" />
            <div className="flex-1 min-w-0">
              <p className="truncate">{p.name}</p>
              <p className="text-xs text-muted">{p.sold} sold</p>
            </div>
            <span className="text-xs font-medium">{formatMoney(p.revenue)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
