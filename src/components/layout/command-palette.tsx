"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  HelpCircle,
  Target,
  BookMarked,
  Mic,
  Settings,
} from "lucide-react";

import {
  bottomNavItems,
  desktopMoreItems,
  desktopPrimaryNav,
  mobilePanelGroups,
  type NavItem,
} from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";

const EXTRA_ROUTES: NavItem[] = [
  { title: "Quiz từ vựng", href: "/quiz", icon: HelpCircle, description: "Luyện quiz" },
  { title: "Thử thách ngày", href: "/challenge", icon: Target, description: "5 câu mỗi ngày" },
  { title: "Ngữ pháp", href: "/grammar", icon: BookMarked, description: "Chủ đề grammar" },
  { title: "Phát âm IPA", href: "/pronunciation", icon: Mic, description: "44 âm IPA" },
  { title: "Cài đặt", href: "/settings", icon: Settings, description: "Tài khoản" },
];

function collectRoutes(): NavItem[] {
  const seen = new Set<string>();
  const items: NavItem[] = [];

  const add = (item: NavItem) => {
    if (seen.has(item.href)) return;
    seen.add(item.href);
    items.push(item);
  };

  [...desktopPrimaryNav, ...desktopMoreItems, ...bottomNavItems].forEach(add);
  mobilePanelGroups.forEach((g) => g.items.forEach(add));
  EXTRA_ROUTES.forEach(add);

  return items.sort((a, b) => a.title.localeCompare(b.title, "vi"));
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const routes = useMemo(() => collectRoutes(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return routes;
    return routes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.href.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q),
    );
  }, [query, routes]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 bg-zinc-950/50 backdrop-blur-sm"
      onClick={close}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Điều hướng nhanh"
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50">
          <Search className="size-4 text-zinc-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm trang… (Trang chủ, Học, Ôn tập…)"
            className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
          />
          <button
            type="button"
            onClick={close}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            aria-label="Đóng"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul className="max-h-[50vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">
              Không tìm thấy trang phù hợp
            </li>
          ) : (
            filtered.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                    {item.href}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>

        <div className="px-4 py-2 border-t border-zinc-200/50 dark:border-zinc-800/50 text-[10px] text-zinc-400 flex justify-between">
          <span>⌘K / Ctrl+K mở palette</span>
          <button
            type="button"
            className={cn(
              "text-emerald-600 dark:text-emerald-400 font-semibold hover:underline",
            )}
            onClick={() => {
              close();
              router.push("/dashboard");
            }}
          >
            Về Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}