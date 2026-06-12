import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full rounded-xl border border-border/90 bg-input/96 px-3.5 py-2.5 text-sm text-foreground caret-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(16,24,18,0.05)] outline-none ring-offset-background placeholder:text-muted-foreground/85 focus-visible:ring-2 focus-visible:ring-ring",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
