import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function formatWeight(value: number) {
  return `${formatNumber(value, 2)} kg`;
}

export function getComparisonMeta(currentValue: number, previousValue: number) {
  const delta = currentValue - previousValue;

  if (previousValue === 0) {
    if (currentValue === 0) {
      return {
        label: "Sama dengan kemarin",
        tone: "text-muted-foreground",
      };
    }

    return {
      label: `+${formatNumber(delta, 2)} dari kemarin`,
      tone: "text-emerald-700",
    };
  }

  const percentage = (delta / previousValue) * 100;
  const prefix = delta > 0 ? "+" : "";
  const tone =
    delta > 0 ? "text-emerald-700" : delta < 0 ? "text-amber-700" : "text-muted-foreground";

  return {
    label: `${prefix}${formatNumber(percentage, 1)}% vs kemarin`,
    tone,
  };
}

export function DashboardMetricCard({
  label,
  value,
  previousValue,
  formatter,
}: {
  label: string;
  value: number;
  previousValue: number;
  formatter: (value: number) => string;
}) {
  const comparison = getComparisonMeta(value, previousValue);

  return (
    <Card className="h-full shadow-sm">
      <CardContent className="p-4">
        <div className="space-y-1.5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </div>
          <div className="text-xl font-semibold tracking-tight">{formatter(value)}</div>
          <div className={`text-xs ${comparison.tone}`}>{comparison.label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
