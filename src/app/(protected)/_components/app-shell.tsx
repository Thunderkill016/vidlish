"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpenCheck,
  BookOpen,
  ChartNoAxesCombined,
  Ear,
  Home,
  LibraryBig,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Hôm nay", icon: Home, match: ["/dashboard"] },
  { href: "/read", label: "Đọc", icon: BookOpen, match: ["/read"] },
  { href: "/listen", label: "Luyện tai", icon: Ear, match: ["/listen"] },
  { href: "/start", label: "Lộ trình", icon: BookOpenCheck, match: ["/start"] },
  { href: "/progress", label: "Tiến bộ", icon: ChartNoAxesCombined, match: ["/progress"] },
  {
    href: "/library",
    label: "Thư viện",
    icon: LibraryBig,
    match: ["/library", "/lessons", "/learning-lab"],
    desktopOnly: true,
  },
  {
    href: "/review",
    label: "Ôn tập",
    icon: RefreshCcw,
    match: ["/review"],
    desktopOnly: true,
  },
] as const;

const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => !("desktopOnly" in item && item.desktopOnly),
);

type NavigationItem = (typeof NAV_ITEMS)[number] & { icon: LucideIcon };

function pathMatches(pathname: string, prefixes: readonly string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function AccountMenu({ email }: { email: string }) {
  return (
    <details className="relative group">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-semibold shadow-sm transition-all hover:border-[var(--border-strong)] hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:min-h-12 lg:w-full lg:px-3.5">
        <span className="flex size-8 shrink-0 place-items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-bold text-white shadow-sm">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 text-left hidden sm:block lg:block">
          <span className="block text-xs font-bold leading-tight truncate text-[var(--foreground)]">
            Tài khoản
          </span>
          <span className="block truncate text-[11px] font-normal text-[var(--muted-foreground)]">
            {email}
          </span>
        </span>
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[var(--shadow-float)] lg:bottom-full lg:left-0 lg:right-auto lg:top-auto lg:mb-2 lg:mt-0">
        <div className="mb-3 border-b border-[var(--border)] pb-2 px-1">
          <p className="text-xs font-semibold text-[var(--foreground)]">Đang đăng nhập</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]" title={email}>
            {email}
          </p>
        </div>
        <Link
          href="/account"
          className="mb-1 flex min-h-10 items-center rounded-xl px-3 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
        >
          Bảo mật & Cài đặt
        </Link>
        <form action="/api/auth/sign-out" method="post">
          <button
            type="submit"
            className="flex min-h-10 w-full items-center rounded-xl px-3 text-left text-xs font-semibold text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md lg:flex lg:flex-col justify-between p-4">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 px-3 pt-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 group"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-[var(--primary)] text-base font-bold text-white shadow-sm transition-transform group-hover:scale-105">
                N
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
                  nếp
                </span>
                <span className="text-[10px] font-medium text-[var(--muted-foreground)] -mt-1">
                  Học tiếng Anh
                </span>
              </div>
            </Link>
          </div>

          <nav aria-label="Điều hướng chính" className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = pathMatches(pathname, item.match);
              const Icon = (item as NavigationItem).icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-all ${
                    active
                      ? "bg-[var(--primary-wash)] text-[var(--primary)] font-bold shadow-xs border border-[var(--primary)]/20"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    size={19}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                  <span>{item.label}</span>
                  {item.href === "/dashboard" ? (
                    <span className="ml-auto flex size-2 rounded-full bg-[var(--accent)]" />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <AccountMenu email={email} />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-h-screen min-w-0 lg:pl-64">
        {/* Mobile Sticky Header */}
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md px-4 sm:px-6 lg:hidden">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-[var(--primary)]"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-[var(--primary)] text-sm text-white font-extrabold">
              N
            </span>
            <span className="text-lg tracking-tight">nếp</span>
          </Link>
          <div className="scale-90">
            <AccountMenu email={email} />
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 py-8 pb-32 sm:px-6 sm:py-10 sm:pb-32 lg:px-10 lg:pb-16">
          {children}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar */}
      <nav
        aria-label="Điều hướng chính trên di động"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-1 shadow-[var(--shadow-float)] backdrop-blur-lg lg:hidden"
      >
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = pathMatches(pathname, item.match);
          const Icon = (item as NavigationItem).icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-13 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-all ${
                active
                  ? "bg-[var(--primary-wash)] text-[var(--primary)] font-bold"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon aria-hidden="true" size={19} strokeWidth={active ? 2.2 : 1.8} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
