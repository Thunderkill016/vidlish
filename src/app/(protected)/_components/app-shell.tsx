"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  ChartNoAxesCombined,
  Ear,
  Home,
  LibraryBig,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Hôm nay", icon: Home, match: ["/dashboard"] },
  { href: "/start", label: "Lộ trình", icon: BookOpenCheck, match: ["/start"] },
  { href: "/review", label: "Ôn tập", icon: RefreshCcw, match: ["/review", "/learning-lab/v2"] },
  { href: "/listen", label: "Luyện tai", icon: Ear, match: ["/listen"] },
  { href: "/library", label: "Thư viện", icon: LibraryBig, match: ["/library", "/lessons"] },
  { href: "/progress", label: "Tiến bộ", icon: ChartNoAxesCombined, match: ["/progress"] },
] as const;

type NavigationItem = (typeof NAV_ITEMS)[number] & { icon: LucideIcon };

function pathMatches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AccountMenu({ email }: { email: string }) {
  return (
    <details className="relative">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:min-h-11 lg:w-full lg:gap-3">
        <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-[var(--primary-wash)] text-xs font-bold text-[var(--primary)] lg:grid">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 lg:flex lg:flex-1 lg:flex-col lg:text-left">
          <span>Tài khoản</span>
          <span className="hidden truncate text-[11px] font-normal text-[var(--muted-foreground)] lg:block">
            {email}
          </span>
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow-card)] lg:bottom-0 lg:left-full lg:right-auto lg:top-auto lg:mb-0 lg:ml-2 lg:mt-0">
        <p className="mb-3 truncate text-xs text-[var(--muted-foreground)]" title={email}>
          {email}
        </p>
        <Link href="/account" className="mb-1 flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold hover:bg-[var(--muted)]">
          Bảo mật tài khoản
        </Link>
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
    <div className="min-h-screen min-w-0 bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[var(--card)] lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-6">
          <Link
            href="/dashboard"
            className="rounded-lg text-xl font-bold tracking-tight text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Nếp
          </Link>
        </div>
        <nav aria-label="Điều hướng chính" className="flex-1 space-y-1 px-3 pb-20 pt-2">
          {NAV_ITEMS.map((item) => {
            const active = pathMatches(pathname, item.match);
            const Icon = (item as NavigationItem).icon;
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
                <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="fixed right-4 top-3 z-50 lg:bottom-3 lg:left-3 lg:right-auto lg:top-auto lg:w-[232px]">
        <AccountMenu email={email} />
      </div>

      <div className="min-h-screen min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-[var(--border)] bg-[var(--card)] px-4 pr-32 sm:px-6 sm:pr-36 lg:hidden">
          <Link
            href="/dashboard"
            className="rounded-lg text-lg font-bold text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Nếp
          </Link>
        </header>

        <main className="mx-auto min-w-0 max-w-7xl overflow-x-clip px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      <nav
        aria-label="Điều hướng chính trên di động"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--card)] px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1 lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathMatches(pathname, item.match);
          const Icon = (item as NavigationItem).icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                active ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
