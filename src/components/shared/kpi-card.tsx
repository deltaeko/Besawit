import { ArrowUpRight, Wallet } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  currency = false,
}: {
  label: string;
  value: number;
  currency?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">
              {currency ? formatCurrency(value) : formatNumber(value, 0)}
            </div>
          </div>
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-2 text-primary">
            {currency ? <Wallet className="size-4" /> : <ArrowUpRight className="size-4" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
