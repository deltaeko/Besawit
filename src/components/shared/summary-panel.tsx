import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SummaryPanel({
  title,
  items,
  footer,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  footer?: ReactNode;
}) {
  return (
    <Card className="sticky top-24 overflow-hidden border-white/90 bg-card/96">
      <CardHeader className="border-b border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(72,115,74,0.12),transparent_52%),linear-gradient(180deg,rgba(246,248,243,0.96),rgba(255,255,255,0.94))] px-5 py-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/80">
          Ringkasan Live
        </div>
        <CardTitle className="text-[1.02rem] tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5 py-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/18 px-4 py-3 text-sm"
          >
            <span className="max-w-[48%] text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.label}
            </span>
            <span className="max-w-[48%] text-right font-semibold tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
        ))}
        {footer}
      </CardContent>
    </Card>
  );
}
