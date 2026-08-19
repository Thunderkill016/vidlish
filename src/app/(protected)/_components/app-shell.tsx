"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", glyph: "home", match: ["/dashboard"] },
  { href: "/create", label: "Tạo bài", glyph: "plus", match: ["/create", "/jobs"] },
  { href: "/library", label: "Thư viện", glyph: "library", match: ["/library", "/lessons"] },
  { href: "/review", label: "Ôn tập", glyph: "review", match: ["/review", "/learning-lab/v2"] },
  { href: "/progress", label: "Tiến bộ", glyph: "progress", match: ["/progress"] },
] as const;

type GlyphName = (typeof NAV_ITEMS)[number]["glyph"];

function NavGlyph({ name }: { name: GlyphName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "home") {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 3.5l8.5 7" />
        <path d="M5.5 9.5v10h13v-10" />
        <path d="M9.5 19.5v-6h5v6" />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
        <rect x="3" y="3" width="18" height="18" rx="5" />
      </svg>
    );
  }
  if (name === "library") {
    return (
      <svg {...common}>
        <path d="M5 4.5h11.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" />
        <path d="M7 4.5v15M9.5 8h6" />
      </svg>
    );
  }
  if (name === "review") {
    return (
      <svg {...common}>
        <path d="M4.5 7.5h10a5 5 0 0 1 0 10H9" />
        <path d="m7.5 4.5-3 3 3 3" />
        <path d="M12 10.5v4l2.5 1.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 19V9M12 19V5M19 19v-7" />
      <path d="M3 19.5h18" />
    </svg>
  );
}

function pathMatches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AccountMenu({ email, compact = false }: { email: string; compact?: boolean }) {
  return (
    <details className="relative">
      <summary
        className={`flex cursor-pointer list-none items-center rounded-xl font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
          compact ? "min-h-10 px-3 text-sm" : "min-h-11 w-full gap-3 px-3 text-sm"
        }`}
      >
        {!compact ? (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-wash)] text-xs font-bold text-[var(--primary)]">
            {email.slice(0, 1).toUpperCase()}
          </span>
        ) : null}
        <span className={compact ? "" : "min-w-0 flex-1 truncate text-left"}>
          {compact ? "Tài khoản" : email}
        </span>
      </summary>
      <div
        className={`absolute z-50 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] ${
          compact ? "right-0 top-full mt-2" : "bottom-0 left-full ml-2"
        }`}
      >
        <p className="mb-3 truncate text-xs text-[var(--muted-foreground)]" title={email}>
          {email}
        </p>
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Đăng xuất
          </button>
        </form>
      </div>
    </details>
  );
}

export function AppShell({ children, email }: { children: ReactNode; email: string }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[var(--card)] lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-6">
          <Link
            href="/dashboard"
            className="rounded-lg text-xl font-bold tracking-tight text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Vidlish
          </Link>
        </div>
        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathMatches(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                  active
                    ? "bg-[var(--primary-wash)] text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <NavGlyph name={item.glyph} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <AccountMenu email={email} />
        </div>
      </aside>

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-[var(--border)] bg-[var(--card)] px-4 sm:px-6 lg:hidden">
          <Link
            href="/dashboard"
            className="rounded-lg text-lg font-bold text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Vidlish
          </Link>
          <div className="ml-auto">
            <AccountMenu email={email} compact />
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Điều hướng chính trên di động"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--card)] px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathMatches(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <NavGlyph name={item.glyph} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
