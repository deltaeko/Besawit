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
    <Card className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,250,246,0.96)_100%)]">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {label}
            </div>
            <div className="mt-2.5 text-2xl font-semibold tracking-tight text-foreground">
              {currency ? formatCurrency(value) : formatNumber(value, 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/10 bg-primary/[0.06] p-2.5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            {currency ? <Wallet className="size-4" /> : <ArrowUpRight className="size-4" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
