"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type PrintMarginPreset,
  getPrintMarginPresetLabel,
  printMarginPresetValues,
} from "@/lib/print-settings";

export function PrintMarginPresetGroup({
  className,
  onChange,
  value,
}: {
  className?: string;
  onChange: (preset: PrintMarginPreset) => void;
  value: PrintMarginPreset;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-[0.26em] text-muted-foreground">
        Preset Cetak
      </span>
      <div className="flex flex-wrap gap-2">
        {printMarginPresetValues.map((preset) => {
          const isActive = preset === value;

          return (
            <Button
              className="min-w-20"
              key={preset}
              onClick={() => onChange(preset)}
              size="sm"
              type="button"
              variant={isActive ? "default" : "outline"}
            >
              {getPrintMarginPresetLabel(preset)}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
