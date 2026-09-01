"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Sprout } from "lucide-react";

import { MainNavRow } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MinimalButton } from "@/components/design-system";
import { signOut } from "@/app/actions/auth";

type HeaderShellProps = {
  user: { id: string } | null;
  avatarUrl?: string;
  fullName?: string;
};

/** V2 minimal header — logo, 3-tab nav (desktop), theme, auth */
export function HeaderShell({ user, fullName }: HeaderShellProps) {
  const pathname = usePathname();
  const isLesson = /^\/learn\/unit/.test(pathname);
  if (isLesson) return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-[var(--minimal-canvas)]/90 dark:bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[var(--minimal-content-max)] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="size-4" />
            </span>
            <span className="text-sm font-bold tracking-tight hidden sm:inline">
              AtoEnglish
            </span>
          </Link>
          <MainNavRow />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              {fullName && (
                <span className="hidden md:inline text-xs font-medium text-muted-foreground max-w-[120px] truncate">
                  {fullName}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                >
                  <LogOut className="size-4" />
                </button>
              </form>
            </>
          ) : (
            <MinimalButton href="/login?mode=login" variant="secondary" className="!min-h-9 !px-3 text-sm">
              Đăng nhập
            </MinimalButton>
          )}
        </div>
      </div>
    </header>
  );
}