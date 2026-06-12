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
        "flex flex-col gap-4 rounded-[1.45rem] border border-white/85 bg-card/94 px-5 py-4 shadow-[0_22px_60px_-36px_rgba(20,37,24,0.24)] ring-1 ring-black/[0.02] print:hidden 2xl:flex-row 2xl:items-center 2xl:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">{left}</div>
      <div className="flex w-full flex-wrap items-center gap-2 2xl:w-auto 2xl:justify-end">
        {right}
      </div>
    </div>
  );
}
