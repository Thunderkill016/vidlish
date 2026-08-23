import { redirect } from "next/navigation";

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

const SKILL_COPY: Record<
  LearningSkill,
  { title: string; description: string; empty: string }
> = {
  listening: {
    title: "Nghe",
    description:
      "Hiện gồm dictation beginner được chấm objective. Viết lại câu nghe được là listening evidence; nó không tự biến thành writing evidence.",
    empty: "Chưa có listening task đủ evidence để ghi nhận.",
  },
  reading: {
    title: "Đọc",
    description:
      "Chỉ tính task có canonical source text được server xác nhận là stimulus đọc, không suy reading từ một câu hỏi choice mơ hồ.",
    empty: "Chưa có reading task đủ evidence để ghi nhận.",
  },
  speaking: {
    title: "Nói",
    description:
      "Vidlish chưa có speaking task + verifier đủ tin cậy. Typed answer, self-check và legacy productive retrieval đều không được đổi nhãn thành speaking.",
    empty: "0 là đúng: chưa có speaking evidence được verify.",
  },
  writing: {
    title: "Viết",
    description:
      "Objective chunk recall được tính khi task thật sự đo written production; guided transfer self-check vẫn nằm riêng ở evidence chưa chấm.",
    empty: "Chưa có writing task đủ evidence để ghi nhận.",
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
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Đo evidence, không cộng XP cho đẹp
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Vidlish chỉ gắn evidence vào kỹ năng mà task thực sự đo. Một đáp án viết
          trong dictation vẫn là evidence nghe; hoàn tất lesson không phải mastery;
          self-check không được đổi thành kết quả objective.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="skills-heading">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Four-skill evidence · {fourSkillProgress.totalObservations} observation(s)
          </p>
          <h2 id="skills-heading" className="text-2xl font-bold">
            Nghe · Đọc · Nói · Viết
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Đây là số lần evidence durable được quan sát, không phải điểm CEFR hay
            phần trăm thành thạo. Attempt lặp lại vẫn là attempt lặp lại — trang này
            không biến event count thành proficiency score.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {fourSkillProgress.skills.map((skill) => {
            const copy = SKILL_COPY[skill.skill];
            const hasEvidence =
              skill.objectiveIndependentSuccesses +
                skill.objectiveSupportedSuccesses +
                skill.objectiveFailures +
                skill.unscoredObservations >
              0;
            return (
              <Card key={skill.skill} className="space-y-4 p-5">
                <div>
                  <h3 className="text-xl font-bold">{copy.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    {copy.description}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">Objective · độc lập</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveIndependentSuccesses}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">Objective · có trợ giúp</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveSupportedSuccesses}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">Objective · chưa đạt</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveFailures}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">Self-check / chưa chấm</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.unscoredObservations}
                    </dd>
                  </div>
                </dl>

                {!hasEvidence ? (
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                    {copy.empty}
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="legacy-heading">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Legacy lexical scheduler evidence
          </p>
          <h2 id="legacy-heading" className="text-2xl font-bold">
            Productive retrieval chưa phân loại speaking/writing
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Các state cũ vẫn hữu ích cho scheduler và lexical gate, nhưng chúng không
            lưu modality đủ rõ để nói learner đã “nói” hay “viết” được. Vì vậy chúng
            được giữ riêng thay vì đổ vào bốn kỹ năng phía trên.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.independent.length}</p>
            <p className="text-sm font-semibold">Retrieval độc lập</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Correct productive retrieval không có support, nhưng legacy evidence
              không chứng minh response là speech hay writing.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.supported.length}</p>
            <p className="text-sm font-semibold">Retrieval có trợ giúp</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Có successful retrieval nhưng chưa có independent evidence trong
              aggregate state.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.encountered.length}</p>
            <p className="text-sm font-semibold">Mới gặp / chưa retrieval thành công</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Exposure không được đổi thành khả năng dùng ngôn ngữ.
            </p>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.transferred.length}</p>
            <p className="text-sm font-semibold">Legacy changed-context transfer</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Có independent retrieval và transfer success trong aggregate state;
              vẫn không được tự gán modality.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{completedLessons}</p>
            <p className="text-sm font-semibold">Bài đã hoàn tất</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Chỉ để đối chiếu attendance. Hoàn tất bài không nói learner nhớ hoặc
              transfer được gì.
            </p>
          </Card>
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Nguồn sự thật</p>
          <h2 className="mt-1 text-xl font-bold">
            Capability được rebuild từ durable evidence
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Four-skill cards được dựng lại từ immutable lesson blueprint,
          privacy-safe attempts, support events và beginner dictation evidence. Không
          có bảng mastery thứ hai và không đọc raw learner text, transcript hay audio
          để dựng progress page.
        </p>
      </Card>
    </div>
  );
}
