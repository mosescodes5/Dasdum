"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const DATA = [
  { name: "Delivered", value: 128, color: "#254B56" },
  { name: "Shipped", value: 34, color: "#DB9E41" },
  { name: "Processing", value: 21, color: "#E9BC73" },
  { name: "Cancelled", value: 6, color: "#68777B" },
];

export function OrderStatusChart() {
  return (
    <div className="border border-hairline bg-white p-5">
      <h3 className="text-sm font-medium text-primary-deep">Orders by status</h3>
      <div className="mt-2 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={DATA} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
              {DATA.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend
              layout="vertical"
              verticalAlign="middle"
              align="right"
              wrapperStyle={{ fontSize: 12, color: "#68777B" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
