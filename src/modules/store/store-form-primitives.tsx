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
        "rounded-2xl border border-border/80 bg-muted/20 p-4",
        emphasis && "border-primary/20 bg-primary/10",
      )}
    >
      <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-2 font-semibold tracking-tight", emphasis ? "text-2xl" : "text-lg")}>
        {value}
      </div>
      {helper ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p> : null}
    </div>
  );
}
