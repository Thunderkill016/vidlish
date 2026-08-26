import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Ear,
  Mic,
  PenLine,
  ShieldCheck,
} from "lucide-react";

import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseLearningCapabilityProgressReader } from "@/adapters/supabase/learning-capability-progress-reader";
import { summariseCapabilityEvidence } from "@/modules/learning/application/summarise-capability-evidence";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createIdentityService } from "@/platform/identity/create-identity-service";
import { createLearningReviewRepository } from "@/platform/learning/create-learning-session-repository";
import { createLessonRepository } from "@/platform/lesson/create-lesson-runtime";
import { createStudyProgressRepository } from "@/platform/study/create-study-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import type { LearningSkill } from "@/shared/contracts/learning-capability";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

const SKILL_CONFIG: Record<
  LearningSkill,
  {
    title: string;
    icon: typeof Ear;
    color: string;
    description: string;
    empty: string;
  }
> = {
  listening: {
    title: "Nghe (Listening)",
    icon: Ear,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    description:
      "Tính những lần bạn nghe một câu rồi viết lại đúng, và máy chấm được đúng hay sai. Viết lại câu vừa nghe chứng minh bạn NGHE ra, không chứng minh bạn viết được — nên nó không được tính sang phần Viết.",
    empty: "Chưa có phần nghe nào đủ căn cứ để ghi.",
  },
  reading: {
    title: "Đọc (Reading)",
    icon: BookOpen,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
    description:
      "Chỉ tính khi có một đoạn tiếng Anh thật để đọc, và máy chủ xác nhận đó đúng là thứ bạn đã đọc. Một câu hỏi chọn đáp án mà nhìn hình cũng đoán ra thì không được tính là đọc.",
    empty: "Chưa có phần đọc nào đủ căn cứ để ghi.",
  },
  speaking: {
    title: "Nói (Speaking)",
    icon: Mic,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    description:
      "Bạn nói vào micro thật, và phần đó được ghi lại là ĐÃ LÀM nhưng CHƯA CHẤM. Lần nói lại sau ít nhất 24 giờ mới có thể tính là bạn tự làm được. Cột \"tự làm được\" của phần Nói vẫn bằng 0 cho tới khi có máy chấm tin cậy — để trống thì thật hơn là điền số ảo.",
    empty: "Chưa có lần nói nào được ghi.",
  },
  writing: {
    title: "Viết (Writing)",
    icon: PenLine,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    description:
      "Chỉ tính khi bài thật sự bắt bạn VIẾT ra tiếng Anh và máy chấm được. Những bài bạn tự đánh giá là mình làm đúng thì nằm riêng ở cột chưa chấm, không trộn vào đây.",
    empty: "Chưa có phần viết nào đủ căn cứ để ghi.",
  },
};

export default async function ProgressPage() {
  const access = await (await createIdentityService()).resolveCurrentAccess();
  if (!access) redirect("/sign-in");

  const generationRepository = createGenerationRepository();
  const transcriptRuntime = createTranscriptRuntime(generationRepository);
  const lessonRepository = createLessonRepository(
    generationRepository,
    transcriptRuntime.repository,
  );
  const [scheduledItems, progressSummaries, fourSkillProgress] = await Promise.all([
    createLearningReviewRepository().listScheduled(access.userId),
    createStudyProgressRepository(lessonRepository).listOwnedSummaries(access.userId),
    new SupabaseLearningCapabilityProgressReader(getAdminSupabaseClient()).read(
      access.userId,
    ),
  ]);
  const capability = summariseCapabilityEvidence(scheduledItems);
  const completedLessons = progressSummaries.filter(
    (summary) => summary.completedAt,
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-wash)] px-3.5 py-1 text-xs font-bold text-[var(--accent)]">
          <ShieldCheck size={14} />
          <span>BẰNG CHỨNG NĂNG LỰC THỰC TẾ</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Đo bằng chứng, không cộng điểm cho đẹp
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--muted-foreground)]">
          Mỗi việc bạn làm chỉ được ghi vào đúng kỹ năng mà nó thật sự đo. Nghe
          một câu rồi gõ lại là bằng chứng NGHE, dù bạn có gõ. Học xong một bài
          không có nghĩa là đã thạo. Và việc bạn tự thấy mình làm được thì không
          được đổi thành kết quả máy chấm.
        </p>
      </div>

      {/* 4 Skills Section */}
      <section className="space-y-6" aria-labelledby="skills-heading">
        <div className="space-y-1 border-b border-[var(--border)] pb-4">
          <h2 id="skills-heading" className="text-2xl font-bold tracking-tight">
            Bốn Kỹ Năng: Nghe · Đọc · Nói · Viết
          </h2>
          <p className="text-xs text-[var(--muted-foreground)]">
            Đếm số lần có căn cứ rõ ràng — không phải điểm CEFR phỏng đoán, không phải tỷ lệ phần trăm ảo.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {fourSkillProgress.skills.map((skill) => {
            const config = SKILL_CONFIG[skill.skill];
            const Icon = config.icon;
            const hasEvidence =
              skill.objectiveIndependentSuccesses +
                skill.objectiveSupportedSuccesses +
                skill.objectiveFailures +
                skill.unscoredObservations >
              0;

            return (
              <Card
                key={skill.skill}
                className="relative overflow-hidden border-[var(--border)] p-6 space-y-5 shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] transition-all"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-xl border ${config.color}`}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-lg font-bold text-[var(--foreground)]">
                      {config.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
                      {config.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
                  <div className="rounded-xl border border-[var(--solved)]/20 bg-[var(--solved-wash)]/40 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-[var(--solved)]">
                      Tự làm được
                    </span>
                    <p className="text-2xl font-extrabold text-[var(--foreground)] tabular-nums">
                      {skill.objectiveIndependentSuccesses}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/60 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                      Có gợi ý
                    </span>
                    <p className="text-2xl font-extrabold text-[var(--foreground)] tabular-nums">
                      {skill.objectiveSupportedSuccesses}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--destructive)]/20 bg-[var(--destructive)]/5 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-[var(--destructive)]">
                      Chưa được
                    </span>
                    <p className="text-2xl font-extrabold text-[var(--destructive)] tabular-nums">
                      {skill.objectiveFailures}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-3 space-y-1">
                    <span className="text-[11px] font-bold text-[var(--muted-foreground)]">
                      Đã làm, chưa chấm
                    </span>
                    <p className="text-2xl font-extrabold text-[var(--foreground)] tabular-nums">
                      {skill.unscoredObservations}
                    </p>
                  </div>
                </div>

                {!hasEvidence ? (
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] italic">
                    {config.empty}
                  </p>
                ) : null}

                {skill.skill === "speaking" ? (
                  <Link
                    href="/learning-lab/v2/speaking"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 text-xs font-bold text-[var(--foreground)] shadow-xs hover:bg-[var(--muted)] transition-colors"
                  >
                    <Mic size={15} />
                    Luyện nói bằng microphone
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Historical Ledger Section */}
      <section className="space-y-6 pt-4 border-t border-[var(--border)]">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
            Tổng hợp dữ liệu từ trước
          </p>
          <h2 className="text-2xl font-bold tracking-tight">
            Số lần bật ra từ vựng & Dùng sang ngữ cảnh mới
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="space-y-1.5 p-5 border-[var(--border)]">
            <p className="text-3xl font-extrabold text-[var(--foreground)]">
              {capability.independent.length}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--solved)]">
              Tự bật ra được
            </p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Bạn nhớ ra đúng mà không cần xem gợi ý.
            </p>
          </Card>

          <Card className="space-y-1.5 p-5 border-[var(--border)]">
            <p className="text-3xl font-extrabold text-[var(--foreground)]">
              {capability.supported.length}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Bật ra khi có gợi ý
            </p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Nhớ ra đúng nhưng lần nào cũng cần mở gợi ý tiếng Việt.
            </p>
          </Card>

          <Card className="space-y-1.5 p-5 border-[var(--border)]">
            <p className="text-3xl font-extrabold text-[var(--accent)]">
              {capability.transferred.length}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
              Dùng sang ngữ cảnh mới
            </p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Dùng đúng trong tình huống khác câu đã học (Unseen context).
            </p>
          </Card>

          <Card className="space-y-1.5 p-5 border-[var(--border)]">
            <p className="text-3xl font-extrabold text-[var(--foreground)]">
              {completedLessons}
            </p>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Bài học đã đi qua
            </p>
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Tổng số bài học hoàn tất (chỉ để đối chiếu lịch sử).
            </p>
          </Card>
        </div>
      </section>

      {/* Ground Truth Card */}
      <Card className="relative overflow-hidden border-[var(--border)] bg-[var(--muted)]/40 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[var(--accent)]" />
          <h3 className="text-base font-bold">Nguồn sự thật: Dựng lại từ dữ liệu gốc</h3>
        </div>
        <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
          Mọi con số phía trên không được lưu cố định mà được dựng lại mỗi lần bạn mở trang: từ nội dung bài học,
          từng lần bạn thử, những lần bạn mở gợi ý, các câu nghe viết lại và biên nhận lần nói.
          Sản phẩm không đoán mò và không tạo bảng số ảo để chiều lòng người dùng.
        </p>
      </Card>
    </div>
  );
}
