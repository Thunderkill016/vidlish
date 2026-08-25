"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_VERSION = 4;

function completedSessionId(blueprintId: string): string | null {
  try {
    const stored = window.localStorage.getItem(
      `vidlish:learning-lab:v${STORAGE_VERSION}:${blueprintId}`,
    );
    if (!stored) return null;
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (
      parsed.version !== STORAGE_VERSION ||
      parsed.blueprintId !== blueprintId ||
      parsed.completed !== true ||
      typeof parsed.sessionId !== "string"
    ) {
      return null;
    }
    return parsed.sessionId;
  } catch {
    return null;
  }
}

/**
 * A navigation convenience, never evidence authority.
 *
 * The learning runtime already persists its resumable UI state in localStorage.
 * We observe that state so the next production step appears immediately after
 * completion without coupling speaking capture into the lesson attempt schema.
 * The destination re-resolves the owned session and the database RPC requires
 * an actually completed lesson, so a stale or edited browser value cannot mint
 * speaking evidence.
 */
export function SpeakingCompletionHandoff({
  blueprintId,
}: {
  blueprintId: string;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSessionId(completedSessionId(blueprintId));
    sync();
    // Storage events do not fire in the tab that made the write. A small poll is
    // limited to this navigation affordance; it does not gate learning or write
    // evidence and is cleared when the page unmounts.
    const timer = window.setInterval(sync, 500);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, [blueprintId]);

  if (!sessionId) return null;

  return (
    <section className="mx-auto mt-5 max-w-3xl rounded-2xl border border-[var(--accent)] bg-[var(--card)] p-5 sm:p-6">
      <p className="text-sm font-semibold text-[var(--accent)]">
        Bước tiếp theo · production bằng giọng nói
      </p>
      <h2 className="mt-1 text-xl font-bold">Nói lại tình huống vừa dùng</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
        Thu âm, nghe lại rồi tự xác nhận. Đây vẫn là bạn tự đánh giá, chưa
        chấm pronunciation hay intelligibility.
      </p>
      <Link
        href={`/learning-lab/v2/speaking?session=${encodeURIComponent(sessionId)}`}
        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white"
      >
        Nói lại bằng giọng thật
      </Link>
    </section>
  );
}
