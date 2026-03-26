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
    <Card className="sticky top-20 shadow-sm">
      <CardHeader className="border-b border-border/70 px-5 py-4">
        <CardTitle className="text-base tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 px-5 py-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-4 border-b border-border/70 pb-3 text-sm"
          >
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-semibold tabular-nums">{item.value}</span>
          </div>
        ))}
        {footer}
      </CardContent>
    </Card>
  );
}
