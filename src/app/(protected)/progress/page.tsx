import Link from "next/link";
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
      "Tính những lần bạn nghe một câu rồi viết lại đúng, và máy chấm được đúng hay sai. Viết lại câu vừa nghe chứng minh bạn NGHE ra, không chứng minh bạn viết được — nên nó không được tính sang phần Viết.",
    empty: "Chưa có phần nghe nào đủ căn cứ để ghi.",
  },
  reading: {
    title: "Đọc",
    description:
      "Chỉ tính khi có một đoạn tiếng Anh thật để đọc, và máy chủ xác nhận đó đúng là thứ bạn đã đọc. Một câu hỏi chọn đáp án mà nhìn hình cũng đoán ra thì không được tính là đọc.",
    empty: "Chưa có phần đọc nào đủ căn cứ để ghi.",
  },
  speaking: {
    title: "Nói",
    description:
      "Bạn nói vào micro thật, và phần đó được ghi lại là ĐÃ LÀM nhưng CHƯA CHẤM. Lần nói lại sau ít nhất 24 giờ mới có thể tính là bạn tự làm được. Tiếng nói gốc không được lưu và không gửi cho AI nào. Cột \"tự làm được\" của phần Nói vẫn bằng 0, và sẽ còn bằng 0 cho tới khi có máy chấm đủ tin cậy — để trống thì thật hơn là điền một con số không ai kiểm được.",
    empty: "Chưa có lần nói nào được ghi.",
  },
  writing: {
    title: "Viết",
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
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tiến bộ</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Đo bằng chứng, không cộng điểm cho đẹp
        </h1>
        <p className="max-w-3xl text-[var(--muted-foreground)]">
          Mỗi việc bạn làm chỉ được ghi vào đúng kỹ năng mà nó thật sự đo. Nghe
          một câu rồi gõ lại là bằng chứng NGHE, dù bạn có gõ. Học xong một bài
          không có nghĩa là đã thạo. Và việc bạn tự thấy mình làm được thì không
          được đổi thành kết quả máy chấm.
        </p>
      </div>

      <section className="space-y-4" aria-labelledby="skills-heading">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Four-skill evidence · {fourSkillProgress.totalObservations} projected record(s)
          </p>
          <h2 id="skills-heading" className="text-2xl font-bold">
            Nghe · Đọc · Nói · Viết
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Các số bên dưới đếm những lần có căn cứ rõ ràng — không phải số lần
            bạn bấm, không phải điểm CEFR, không phải phần trăm thành thạo. Phần
            người mới được gom theo từng từ, còn phần bài học đếm theo từng lần
            làm, nên hai bên không so trực tiếp được: kỹ năng có số lớn hơn
            không có nghĩa là kỹ năng đó khá hơn.
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
                    <dt className="text-[var(--muted-foreground)]">
                      Tự làm được
                    </dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveIndependentSuccesses}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">
                      Làm được khi có gợi ý
                    </dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveSupportedSuccesses}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">
                      Chưa được
                    </dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.objectiveFailures}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--muted)] p-3">
                    <dt className="text-[var(--muted-foreground)]">
                      Đã làm, chưa chấm
                    </dt>
                    <dd className="mt-1 text-2xl font-bold">
                      {skill.unscoredObservations}
                    </dd>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Tự làm {skill.unscoredIndependentObservations} · có gợi ý {" "}
                      {skill.unscoredSupportedObservations}
                    </p>
                  </div>
                </dl>

                {!hasEvidence ? (
                  <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                    {copy.empty}
                  </p>
                ) : null}

                {skill.skill === "speaking" ? (
                  <Link
                    href="/learning-lab/v2/speaking"
                    className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold"
                  >
                    Luyện nói bằng microphone
                  </Link>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="legacy-heading">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Số liệu cũ, giữ riêng
          </p>
          <h2 id="legacy-heading" className="text-2xl font-bold">
Những lần bạn tự bật ra được từ, nhưng không rõ bằng miệng hay bằng tay
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
            Đây là dữ liệu từ đợt trước. Nó vẫn dùng được để xếp lịch ôn và để
            biết bạn đã gặp từ nào, nhưng nó không ghi lại bạn đã NÓI ra hay VIẾT
            ra. Vì không biết, nên nó nằm riêng ở đây chứ không được cộng vào bốn
            kỹ năng phía trên — đoán rồi cộng vào sẽ làm bốn con số kia sai.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.independent.length}</p>
            <p className="text-sm font-semibold">Tự bật ra được</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Bạn nhớ ra đúng mà không cần gợi ý. Chỉ không rõ lúc đó bạn nói ra
              hay gõ ra.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.supported.length}</p>
            <p className="text-sm font-semibold">Bật ra được khi có gợi ý</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Bạn nhớ ra đúng, nhưng lần nào cũng cần gợi ý. Chưa có lần nào tự
              làm được.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.encountered.length}</p>
            <p className="text-sm font-semibold">
              Mới gặp, chưa nhớ ra được lần nào
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Đã nhìn thấy không phải là đã dùng được. Gặp một từ nhiều lần vẫn là
              gặp, không tự thành biết.
            </p>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{capability.transferred.length}</p>
            <p className="text-sm font-semibold">Dùng được sang ngữ cảnh khác</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Bạn tự nhớ ra được, và dùng đúng cả trong một câu khác câu đã học —
              không phải nhắc lại đúng câu cũ. Vẫn không rõ nói hay viết.
            </p>
          </Card>
          <Card className="space-y-1 p-5">
            <p className="text-3xl font-bold">{completedLessons}</p>
            <p className="text-sm font-semibold">Bài đã hoàn tất</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Chỉ để đối chiếu xem bạn đã đi qua bao nhiêu bài. Học hết một bài
              không nói được gì về việc bạn còn nhớ hay dùng được gì.
            </p>
          </Card>
        </div>
      </section>

      <Card className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-[var(--evidence)]">Nguồn sự thật</p>
          <h2 className="mt-1 text-xl font-bold">
            Mọi con số đều dựng lại từ dữ liệu gốc
          </h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
          Bốn ô kỹ năng phía trên không được lưu sẵn ở đâu cả. Mỗi lần bạn mở
          trang này, chúng được đếm lại từ đầu: từ nội dung bài học (thứ không sửa
          được sau khi tạo), từ từng lần bạn làm, từ những lần bạn mở gợi ý, từ
          các câu bạn nghe rồi viết lại, và từ biên nhận của những lần bạn nói.
          Trang này không đọc chữ bạn viết, không đọc lời thoại video, không nghe
          tiếng bạn nói, và không có một bảng &ldquo;đã thạo&rdquo; nào chạy song
          song — nếu có, hai bảng sẽ lệch nhau, và bạn sẽ không biết bảng nào
          đúng.
        </p>
      </Card>
    </div>
  );
}
