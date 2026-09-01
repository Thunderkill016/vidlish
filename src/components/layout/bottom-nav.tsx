"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { bottomNavItems } from "@/lib/constants/navigation";

interface BottomNavProps {
  /** Number of SRS cards due for review — shows badge on SRS tab */
  dueCardsCount?: number;
}

/**
 * BottomNav — Mobile-first persistent tab bar (sm: and below).
 *
 * Tabs (3-tab shell — Hick-compliant):
 *   Học | Ôn | Tôi
 *
 * Key improvements vs old nav:
 * - Speaking now in Tier 1 (was completely hidden on mobile)
 * - SRS badge shows due card count when > 0
 * - Active pill animation via Framer Motion layoutId
 * - Safe area bottom padding for iOS home indicator
 * - Hidden during lesson pages (handled by LessonPageHider)
 */
export function BottomNav({ dueCardsCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  // Hide during lesson pages (full-screen learning UI)
  const isInLesson = /^\/learn\/unit/.test(pathname);
  if (isInLesson) return null;

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-background/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 flex items-stretch justify-around shadow-[0_-4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]"
      aria-label="Điều hướng chính"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {bottomNavItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href === "/me" && pathname.startsWith("/settings")) ||
          pathname.startsWith(item.href + "/");
        const isFlashcards = item.href === "/flashcards";
        const showBadge = isFlashcards && dueCardsCount > 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            data-tab={item.href.replace("/", "")}
            aria-current={isActive ? "page" : undefined}
            aria-label={item.description ?? item.title}
            className="relative flex-1 flex flex-col items-center justify-center py-1 select-none group"
          >
            {/* Active background pill */}
            {isActive && (
              <motion.div
                layoutId="activeBottomTabPill"
                className="absolute inset-x-1.5 top-1 bottom-1 bg-primary/10 dark:bg-primary/15 rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}

            {/* Icon container with badge */}
            <span className="relative flex items-center justify-center">
              <span
                className={`flex size-6 items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? "text-primary scale-110"
                    : "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
                }`}
              >
                <Icon className="size-5" strokeWidth={isActive ? 2.2 : 1.8} />
              </span>

              {/* SRS badge — red dot with count */}
              {showBadge && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center bg-red-500 text-white text-[9px] font-black rounded-full px-0.5 shadow-sm shadow-red-500/30"
                >
                  {dueCardsCount > 99 ? "99+" : dueCardsCount}
                </motion.span>
              )}
            </span>

            {/* Label */}
            <span
              className={`text-[9px] font-bold mt-0.5 tracking-tight transition-all duration-200 ${
                isActive
                  ? "text-primary font-black"
                  : "text-muted-foreground group-hover:text-foreground"
              }`}
            >
              {item.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
