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
      className="scroll-mt-24 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? (
          <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * The lesson as a place to study, not a page to read.
 *
 * Every teachable item can be heard in the embedded player, every activity is
 * answered rather than revealed, and the answers are saved as the learner
 * works, so closing the tab does not throw the session away.
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      {/* Sticky only where there is a column to spare. On a phone a pinned
          video eats a third of the screen and covers the very answers the
          learner is reaching for; the audio keeps playing once it scrolls
          away, which is what listening practice actually needs. */}
      <div className="lg:sticky lg:top-6 lg:order-2">
        <LessonPlayer
          ref={playerRef}
          videoId={videoId}
          title={lesson.videoTitle}
        />
        <div className="mt-3 hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:block">
          <ProgressPanel
            score={score}
            completedAt={completedAt}
            status={status}
            onToggleCompleted={() => setCompleted(completedAt === null)}
          />
        </div>
      </div>

      <div className="space-y-6 lg:order-1">
        <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold text-[var(--accent)]">
            Bài học · {lesson.cefrLevel} · trình độ video {draft.estimatedLevel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">{draft.titleVi}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {lesson.videoTitle} — {lesson.channelName}
          </p>
          <nav aria-label="Các phần của bài học" className="flex flex-wrap gap-2 pt-2">
            {[
              ["tom-tat", "Tóm tắt"],
              ["tu-vung", "Từ vựng"],
              ["cum-tu", "Cụm từ"],
              ["ngu-phap", "Ngữ pháp"],
              ["kiem-tra", "Kiểm tra"],
              ["dien-tu", "Điền từ"],
              ["luyen-nghe", "Luyện nghe"],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="rounded-lg border border-[var(--border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--muted)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </section>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 lg:hidden">
          <ProgressPanel
            score={score}
            completedAt={completedAt}
            status={status}
            onToggleCompleted={() => setCompleted(completedAt === null)}
          />
        </div>

        <Section id="tom-tat" title="Tóm tắt">
          <p className="text-sm">{draft.summaryVi}</p>
          <p className="text-sm italic text-[var(--muted-foreground)]">
            {draft.summaryEn}
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-foreground)]">
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

        <Section id="cum-tu" title="Cụm từ tự nhiên">
          <ul className="space-y-4">
            {draft.phrases.map((item) => (
              <li key={item.phrase} className="space-y-1">
                <p className="font-semibold">
                  {item.phrase}{" "}
                  <span className="font-normal text-[var(--muted-foreground)]">
                    — {item.meaningVi}
                  </span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
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

        <Section id="ngu-phap" title="Ngữ pháp">
          <ul className="space-y-4">
            {draft.grammarPoints.map((item) => (
              <li key={item.titleVi} className="space-y-1">
                <p className="font-semibold">{item.titleVi}</p>
                <p className="font-mono text-sm text-[var(--accent)]">
                  {item.pattern}
                </p>
                <p className="text-sm">{item.explanationVi}</p>
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

        <p className="text-xs text-[var(--muted-foreground)]">
          Mọi câu trích dẫn được lấy trực tiếp từ lời thoại trong video.
        </p>
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
        <p className="text-sm font-semibold">Tiến độ học</p>
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
      <p className="text-xs text-[var(--muted-foreground)]">
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
