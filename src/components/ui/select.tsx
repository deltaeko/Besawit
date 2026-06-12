import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  placeholder?: string;
};

export function Select({ className, children, placeholder, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-border/90 bg-input/96 px-3.5 py-2 pr-10 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_1px_2px_rgba(16,24,18,0.05)] outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
