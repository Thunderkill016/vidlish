import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "interactive" | "flat";
}

export function Card({
  className,
  variant = "default",
  ...props
}: CardProps) {
  const variantStyles = {
    default:
      "border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]",
    glass:
      "glass-panel shadow-[var(--shadow-card)]",
    interactive:
      "border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)] transition-all duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-float)] hover:-translate-y-0.5",
    flat:
      "border border-[var(--border)] bg-[var(--muted)]",
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-6 transition-colors",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
