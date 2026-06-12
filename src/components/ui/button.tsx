import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_rgba(47,107,70,0.55)] hover:bg-primary/92 hover:shadow-[0_16px_34px_-18px_rgba(47,107,70,0.5)]",
        outline:
          "border border-border/90 bg-card/92 text-foreground shadow-[0_10px_24px_-20px_rgba(20,37,24,0.28)] hover:bg-accent/80",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:bg-secondary/92",
        ghost: "text-foreground hover:bg-accent/80",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_12px_28px_-16px_rgba(196,83,63,0.45)] hover:bg-destructive/92",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
