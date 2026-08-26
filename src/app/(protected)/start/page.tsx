import { redirect } from "next/navigation";
import { BookOpen, CheckCircle, Headphones, Sparkles } from "lucide-react";

import {
  beginnerSentenceCatalogueSize,
  readableSentenceCount,
} from "@/adapters/vocabulary/beginner-sentence-catalogue";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { readPanel } from "@/platform/reliability/read-panel";
import { createBeginnerProgressRepository } from "@/platform/learning/create-beginner-progress-repository";
import { Card } from "@/shared/ui/card";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import { courseMap } from "@/modules/curriculum/application/course-map";

import { BeginnerSession } from "./_components/beginner-session";
import { CourseRoadmap } from "./_components/course-roadmap";
import { CalibrationCheck } from "./_components/calibration-check";

export const dynamic = "force-dynamic";

export default async function StartPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const knownRead = await readPanel("từ nền", async () =>
    (await createBeginnerProgressRepository()).knownWords(access.userId),
  );

  if (knownRead.kind === "unavailable") {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Chưa bắt đầu được lúc này</h1>
        <Card className="flex flex-col gap-3 border-[var(--destructive)]/30 bg-[var(--destructive)]/5" data-testid="start-unavailable">
          <p className="text-sm font-semibold text-[var(--destructive)]">
            Chưa đọc được số từ bạn đã học, nên buổi học chưa thể bắt đầu.
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Sản phẩm không đoán bừa là bạn chưa biết gì: làm vậy sẽ dạy lại
            những từ bạn đã nói ra được, và ghi đè lên chính bằng chứng đó. Thà
            dừng lại còn hơn làm hỏng tiến độ của bạn.
          </p>
        </Card>
      </main>
    );
  }

  const known = knownRead.value;
  const knownSet = new Set(known);
  const readable = readableSentenceCount(knownSet);
  const map = courseMap(FOUNDATION_UNITS, knownSet);
  const corpus = beginnerSentenceCatalogueSize();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      {/* Header section */}
      <header className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--primary-wash)] px-3.5 py-1 text-xs font-bold text-[var(--primary)]">
          <Headphones size={14} />
          <span>LỘ TRÌNH TỪ SỐ 0</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Nghe một câu để bắt đầu dùng tiếng Anh
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-foreground)] max-w-2xl">
          Mỗi câu ở đây chỉ có đúng một từ bạn chưa gặp (nguyên lý i+1). Không phải vì dễ hơn —
          mà vì một câu có hai từ mới thì bạn sẽ đoán, và đoán thì không chuyển thành phản xạ được.
        </p>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="relative overflow-hidden border-[var(--border)] p-5 space-y-2 hover:border-[var(--primary)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Vốn từ tự sản sinh
            </span>
            <CheckCircle size={18} className="text-[var(--solved)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight tabular-nums text-[var(--foreground)]">
              {known.length}
            </span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">từ đã tự nói được</span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            Tự nói ra không mở gợi ý. Quyết định câu tiếp theo bạn gặp.
          </p>
        </Card>

        <Card className="relative overflow-hidden border-[var(--border)] p-5 space-y-2 hover:border-[var(--accent)]/40 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
              Khả năng đọc hiểu
            </span>
            <BookOpen size={18} className="text-[var(--accent)]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight tabular-nums text-[var(--foreground)]">
              {readable.toLocaleString("vi-VN")}
            </span>
            <span className="text-xs font-medium text-[var(--muted-foreground)]">
              / {corpus.toLocaleString("vi-VN")} câu trọn vẹn
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            Số câu bạn đọc hiểu 100% không có từ lạ trong kho câu chuẩn.
          </p>
        </Card>
      </div>

      {/* Main Beginner Interactive Session */}
      <section className="space-y-3">
        <BeginnerSession />
      </section>

      {/* Calibration Check if applicable */}
      {known.length > 0 ? <CalibrationCheck /> : null}

      {/* Roadmap Component */}
      <section className="space-y-4 pt-4 border-t border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--primary)]" />
            <h2 className="text-xl font-bold tracking-tight">Cây Kỹ Năng & Lộ Trình 30 Unit</h2>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            Từng chặng từ Pre-A1 Sinh tồn đến A1 Giao tiếp và A2 Thực tế công việc.
          </p>
        </div>
        <CourseRoadmap map={map} />
      </section>
    </div>
  );
}
