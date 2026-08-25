"use client";

import { useRef } from "react";

import { scoreStudyProgress } from "@/modules/study/application/score-study-progress";
import type { Lesson } from "@/shared/contracts/lesson";
import {
  emptyStudyProgressState,
  type StudyProgress,
} from "@/shared/contracts/study";
import { Button } from "@/shared/ui/button";

import { CitationList } from "./citation-list";
import { ClozePractice } from "./cloze-practice";
import { ComprehensionQuiz } from "./comprehension-quiz";
import { ListeningLab, type TranscriptLine } from "./listening-lab";
import { LessonPlayer, type LessonPlayerHandle } from "./youtube-player";
import { useStudyProgress, type StudySaveStatus } from "./use-study-progress";
import { VocabularyTrainer } from "./vocabulary-trainer";

const saveStatusLabel: Record<StudySaveStatus, string> = {
  idle: "Tiến độ được lưu tự động",
  saving: "Đang lưu tiến độ…",
  saved: "Đã lưu tiến độ",
  error: "Chưa lưu được tiến độ — kết quả trên màn hình vẫn giữ nguyên",
};

const LESSON_SECTIONS = [
  ["tom-tat", "Tóm tắt"],
  ["tu-vung", "Từ vựng"],
  ["cum-tu", "Cụm từ"],
  ["ngu-phap", "Ngữ pháp"],
  ["kiem-tra", "Kiểm tra"],
  ["dien-tu", "Điền từ"],
  ["luyen-nghe", "Luyện nghe"],
] as const;

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-24 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-1.5">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {description ? (
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The lesson as a place to study, not a page to read.
 *
 * The source stays beside the work on larger screens so every teachable item
 * can be checked against the video without losing the learner's place. Mobile
 * keeps the same order but never pins the player over the answer controls.
 */
export function LessonView({
  lesson,
  transcript,
  initialProgress,
}: {
  lesson: Lesson;
  transcript: readonly TranscriptLine[];
  initialProgress: StudyProgress | null;
}) {
  const playerRef = useRef<LessonPlayerHandle | null>(null);
  const { draft, citations, videoId } = lesson;

  const { state, completedAt, status, update, setCompleted } = useStudyProgress({
    jobId: lesson.jobId,
    initialState: initialProgress?.state ?? emptyStudyProgressState,
    initialCompletedAt: initialProgress?.completedAt ?? null,
  });

  const score = scoreStudyProgress(draft, state);
  const play = (startMs: number, endMs: number) =>
    playerRef.current?.playSegment(startMs, endMs);

  return (
    <div className="min-w-0 space-y-5">
      <header className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-[var(--accent)]">
              Study Mode · {lesson.cefrLevel} · nguồn {draft.estimatedLevel}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{draft.titleVi}</h1>
            <p className="break-words text-sm text-[var(--muted-foreground)]">
              {lesson.videoTitle} — {lesson.channelName}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-[var(--primary-wash)] px-3 py-2 text-xs font-semibold text-[var(--primary)]">
            Học từ lời thoại thật
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(300px,0.72fr)_minmax(0,1.28fr)] lg:items-start">
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="min-w-0 space-y-4 rounded-2xl border border-[var(--evidence-border)] bg-[var(--evidence-wash)] p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--evidence)]">
                  Nguồn có thể kiểm chứng
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Mọi nút nghe lại và câu trích dẫn trong bài đều quay về video này.
                </p>
              </div>
            </div>
            <LessonPlayer
              ref={playerRef}
              videoId={videoId}
              title={lesson.videoTitle}
            />
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-5">
            <ProgressPanel
              score={score}
              completedAt={completedAt}
              status={status}
              onToggleCompleted={() => setCompleted(completedAt === null)}
            />
          </section>

          <nav
            aria-label="Các phần của bài học"
            className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm"
          >
            <p className="px-2 pb-2 text-xs font-bold uppercase tracking-[0.12em] text-[var(--faint-foreground)]">
              Bài học này
            </p>
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {LESSON_SECTIONS.map(([id, label], index) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="flex min-h-10 min-w-max items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:min-w-0"
                >
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--muted)] font-mono text-[10px] text-[var(--faint-foreground)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <main className="min-w-0 space-y-5">
          <Section
            id="tom-tat"
            title="Tóm tắt"
            description="Lấy ngữ cảnh trước khi đi vào từ, cụm và bài tập."
          >
            <p className="text-sm leading-6">{draft.summaryVi}</p>
            <p className="text-sm italic leading-6 text-[var(--muted-foreground)]">
              {draft.summaryEn}
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--muted-foreground)]">
              {draft.difficultyReasonsVi.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </Section>

          <Section
            id="tu-vung"
            title={`Từ vựng (${draft.vocabulary.length})`}
            description="Nghe từ trong câu gốc trước, rồi đánh dấu khi đã thuộc."
          >
            <VocabularyTrainer
              lesson={lesson}
              state={state}
              onPlay={play}
              onToggleMastered={(index) =>
                update((current) => ({
                  ...current,
                  masteredVocabulary: current.masteredVocabulary.includes(index)
                    ? current.masteredVocabulary.filter((value) => value !== index)
                    : [...current.masteredVocabulary, index],
                }))
              }
            />
          </Section>

          <Section
            id="cum-tu"
            title="Cụm từ tự nhiên"
            description="Ưu tiên cụm có chức năng giao tiếp và đối chiếu được với nguồn."
          >
            <ul className="space-y-4">
              {draft.phrases.map((item) => (
                <li key={item.phrase} className="space-y-1 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">
                    {item.phrase}{" "}
                    <span className="font-normal text-[var(--muted-foreground)]">
                      — {item.meaningVi}
                    </span>
                  </p>
                  <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                    {item.usageNoteVi}
                  </p>
                  <CitationList
                    segmentIds={item.sourceSegmentIds}
                    citations={citations}
                    videoId={videoId}
                    onPlay={play}
                  />
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="ngu-phap"
            title="Ngữ pháp"
            description="Chỉ giữ pattern xuất hiện trong ngữ cảnh của video."
          >
            <ul className="space-y-4">
              {draft.grammarPoints.map((item) => (
                <li key={item.titleVi} className="space-y-2 rounded-xl border border-[var(--border)] p-4">
                  <p className="font-semibold">{item.titleVi}</p>
                  <p className="font-mono text-sm text-[var(--accent)]">
                    {item.pattern}
                  </p>
                  <p className="text-sm leading-6">{item.explanationVi}</p>
                  <p className="text-sm">Ví dụ: {item.exampleEn}</p>
                  <CitationList
                    segmentIds={item.sourceSegmentIds}
                    citations={citations}
                    videoId={videoId}
                    onPlay={play}
                  />
                </li>
              ))}
            </ul>
          </Section>

          <Section
            id="kiem-tra"
            title="Kiểm tra hiểu nội dung"
            description="Chọn đáp án để được chấm ngay. Mỗi câu chỉ trả lời một lần."
          >
            <ComprehensionQuiz
              lesson={lesson}
              state={state}
              onPlay={play}
              onAnswer={(index, selectedIndex) =>
                update((current) =>
                  current.comprehensionAnswers.some(
                    (answer) => answer.index === index,
                  )
                    ? current
                    : {
                        ...current,
                        comprehensionAnswers: [
                          ...current.comprehensionAnswers,
                          { index, selectedIndex },
                        ],
                      },
                )
              }
            />
          </Section>

          <Section
            id="dien-tu"
            title="Điền từ"
            description="Nghe câu gốc rồi tự điền. Xem đáp án được ghi lại riêng với tự làm đúng."
          >
            <ClozePractice
              lesson={lesson}
              state={state}
              onPlay={play}
              onAttempt={(index, result) =>
                update((current) => ({
                  ...current,
                  clozeAttempts: [
                    ...current.clozeAttempts.filter(
                      (attempt) => attempt.index !== index,
                    ),
                    { index, ...result },
                  ],
                }))
              }
            />
          </Section>

          <Section
            id="luyen-nghe"
            title="Luyện nghe"
            description="Toàn bộ lời thoại tiếng Anh đủ điều kiện của video, nghe từng câu một."
          >
            <ListeningLab lines={transcript} onPlay={play} />
          </Section>

          <p className="rounded-xl border border-[var(--evidence-border)] bg-[var(--evidence-wash)] p-3 text-xs leading-5 text-[var(--evidence)]">
            Nguồn thật: mọi câu trích dẫn hiển thị ở đây được lấy trực tiếp từ lời thoại đã được Nếp cho phép dùng trong video.
          </p>
        </main>
      </div>
    </div>
  );
}

function ProgressPanel({
  score,
  completedAt,
  status,
  onToggleCompleted,
}: {
  score: ReturnType<typeof scoreStudyProgress>;
  completedAt: string | null;
  status: StudySaveStatus;
  onToggleCompleted: () => void;
}) {
  return (
    <div className="space-y-3" data-testid="study-progress">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Tiến độ phiên này</p>
          <p className="mt-0.5 text-[11px] text-[var(--faint-foreground)]">
            Completion, không phải mastery
          </p>
        </div>
        <p className="text-sm font-semibold text-[var(--accent)]">
          {score.percent}%
        </p>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]"
        role="progressbar"
        aria-valuenow={score.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Tiến độ học bài này"
      >
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-[width]"
          style={{ width: `${score.percent}%` }}
        />
      </div>
      <p className="text-xs leading-5 text-[var(--muted-foreground)]">
        Bài tập đúng {score.correctActivities}/{score.answeredActivities} đã làm
        · tổng {score.totalActivities} · từ vựng đã thuộc{" "}
        {score.masteredVocabularyCount}/{score.vocabularyTotal}
      </p>
      <Button
        variant={completedAt ? "secondary" : "primary"}
        onClick={onToggleCompleted}
        className="w-full"
      >
        {completedAt ? "Bỏ đánh dấu hoàn thành" : "Đánh dấu đã hoàn thành"}
      </Button>
      <p
        className="text-xs text-[var(--muted-foreground)]"
        data-testid="study-save-status"
      >
        {saveStatusLabel[status]}
      </p>
    </div>
  );
}
