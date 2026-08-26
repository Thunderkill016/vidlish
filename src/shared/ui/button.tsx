import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary-hover)] hover:shadow-md",
        secondary:
          "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--border-strong)] hover:bg-[var(--muted)]",
        accent:
          "bg-[var(--accent)] text-white shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--muted)]",
        glass:
          "glass-panel text-[var(--foreground)] hover:bg-[var(--muted)]",
      },
      size: {
        sm: "min-h-9 px-3 text-xs rounded-lg",
        default: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-6 text-base rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
