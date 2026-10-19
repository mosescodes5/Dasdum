"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatMoneyCompact } from "@/lib/currency";

// Demo figures — replace with a real 7-day aggregate query once orders are flowing.
const DATA = [
  { day: "Mon", sales: 42000 },
  { day: "Tue", sales: 38500 },
  { day: "Wed", sales: 51000 },
  { day: "Thu", sales: 47500 },
  { day: "Fri", sales: 63000 },
  { day: "Sat", sales: 71500 },
  { day: "Sun", sales: 58000 },
];

const formatGBP = formatMoneyCompact;

export function SalesChart() {
  return (
    <div className="border border-hairline bg-white p-5">
      <h3 className="text-sm font-medium text-primary-deep">Sales, last 7 days</h3>
      <div className="mt-4 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="rgba(23,37,43,0.08)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#68777B" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: "#68777B" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatGBP(v)}
              width={60}
            />
            <Tooltip formatter={(value: number) => formatGBP(value)} />
            <Line type="monotone" dataKey="sales" stroke="#DB9E41" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
