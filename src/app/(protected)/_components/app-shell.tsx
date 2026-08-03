import Link from "next/link";

export function AppShell({ children, email }: { children: React.ReactNode; email: string }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link
            href="/create"
            className="flex min-h-11 items-center rounded-lg font-bold text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Vidlish
          </Link>
          <nav aria-label="Điều hướng chính" className="ml-auto flex items-center gap-1 sm:gap-3">
            <Link
              href="/create"
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Tạo bài học
            </Link>
            <Link
              href="/library"
              className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              Thư viện
            </Link>
            <details className="relative">
              <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">
                Tài khoản
              </summary>
              <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-lg">
                <p className="mb-3 truncate text-xs text-[var(--muted-foreground)]" title={email}>
                  {email}
                </p>
                <form action="/api/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm font-semibold hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    Đăng xuất
                  </button>
                </form>
              </div>
            </details>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
