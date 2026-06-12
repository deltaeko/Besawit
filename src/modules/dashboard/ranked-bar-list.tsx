import { cn } from "@/lib/utils";

export function RankedBarList({
  items,
  emptyMessage,
  tone = "green",
}: {
  items: Array<{
    id: string;
    label: string;
    secondary: string;
    value: number;
    valueLabel: string;
    helper?: string;
  }>;
  emptyMessage: string;
  tone?: "green" | "amber";
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const width = `${Math.max((item.value / maxValue) * 100, 8)}%`;

        return (
          <div
            key={item.id}
            className="rounded-2xl border border-border/70 bg-card/70 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Peringkat {index + 1}
                </div>
                <div className="mt-1 truncate font-semibold text-foreground">{item.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.secondary}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">{item.valueLabel}</div>
                {item.helper ? (
                  <div className="mt-1 text-xs text-muted-foreground">{item.helper}</div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted/50">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone === "green" ? "bg-[#315d3f]" : "bg-[#c66d2e]",
                )}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
