"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { desktopPrimaryNav } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

/** Desktop 3-tab nav — Hick-compliant, no "Thêm" dropdown (V2) */
export function MainNavRow() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="Điều hướng chính">
      {desktopPrimaryNav.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/me" && pathname.startsWith("/settings")) ||
          pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[var(--minimal-motion-ms)]",
              isActive
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-3.5 shrink-0" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}