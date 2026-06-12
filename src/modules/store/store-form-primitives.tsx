"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function StoreFieldLabel({
  children,
  required = false,
  htmlFor,
}: {
  children: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label className="flex items-center gap-1.5" htmlFor={htmlFor}>
      <span>{children}</span>
      {required ? <span className="text-destructive">*</span> : null}
    </Label>
  );
}

export function StoreFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function StoreFieldHint({ children }: { children: string }) {
  return <p className="text-xs leading-5 text-muted-foreground">{children}</p>;
}

export function StoreMetricCard({
  label,
  value,
  helper,
  emphasis = false,
}: {
  label: string;
  value: string;
  helper?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.35rem] border border-border/80 bg-card/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
        emphasis && "border-primary/20 bg-[linear-gradient(180deg,rgba(72,115,74,0.12),rgba(72,115,74,0.06))]",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 font-semibold tracking-tight text-foreground",
          emphasis ? "text-[1.7rem]" : "text-[1.08rem]",
        )}
      >
        {value}
      </div>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
