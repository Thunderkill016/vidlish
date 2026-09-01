"use client";
import { usePathname } from "next/navigation";

export function LessonPageHider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Hide header/bottom-nav on unit lesson pages (full-screen lesson UI)
  const isLessonPage = /^\/learn\/unit/.test(pathname);
  if (isLessonPage) return null;
  return <>{children}</>;
}
