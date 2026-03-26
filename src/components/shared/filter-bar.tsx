import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FilterBar({
  left,
  right,
  className,
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border/80 bg-card px-4 py-3 shadow-sm 2xl:flex-row 2xl:items-center 2xl:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{left}</div>
      <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:justify-end">
        {right}
      </div>
    </div>
  );
}
