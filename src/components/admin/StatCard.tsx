import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  delta?: string;
  deltaPositive?: boolean;
  icon: LucideIcon;
};

export function StatCard({ label, value, delta, deltaPositive = true, icon: Icon }: Props) {
  return (
    <div className="border border-hairline bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <Icon size={16} className="text-primary-deep" />
      </div>
      <p className="mt-3 text-2xl font-display text-primary-deep">{value}</p>
      {delta && (
        <p className={`mt-1 text-xs ${deltaPositive ? "text-green-700" : "text-red-600"}`}>
          {delta} vs last period
        </p>
      )}
    </div>
  );
}
