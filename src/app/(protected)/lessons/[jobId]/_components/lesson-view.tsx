import type { Lesson, LessonCitation } from "@/shared/contracts/lesson";

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Renders the exact transcript line an item came from, with the timestamp so a
 * learner can find it in the video. The text is server-hydrated, never
 * model-authored.
 */
function Source({
  segmentIds,
  citations,
  videoId,
}: {
  segmentIds: string[];
  citations: LessonCitation[];
  videoId: string;
}) {
  const cited = segmentIds
    .map((id) => citations.find((citation) => citation.segmentId === id))
    .filter((citation): citation is LessonCitation => Boolean(citation));
  if (cited.length === 0) return null;

  return (
    <ul className="space-y-1 border-l-2 border-[var(--border)] pl-3">
      {cited.map((citation) => (
        <li key={citation.segmentId} className="text-sm">
          <a
            className="font-mono text-xs text-[var(--accent)] underline"
            href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(citation.startMs / 1000)}s`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {formatTimestamp(citation.startMs)}
          </a>{" "}
          <span className="text-[var(--muted-foreground)]">
            &ldquo;{citation.text}&rdquo;
          </span>
        </li>
      ))}
    </ul>
  );
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { draft, citations, videoId } = lesson;

  return (
    <div className="space-y-6">
      <section className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Bài học · {lesson.cefrLevel} · trình độ video {draft.estimatedLevel}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{draft.titleVi}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {lesson.videoTitle} — {lesson.channelName}
        </p>
      </section>

      <Section title="Tóm tắt">
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

      <Section title={`Từ vựng (${draft.vocabulary.length})`}>
        <ul className="space-y-4">
          {draft.vocabulary.map((item) => (
            <li key={item.term} className="space-y-1">
              <p className="font-semibold">
                {item.term}{" "}
                <span className="font-normal text-[var(--muted-foreground)]">
                  ({item.partOfSpeech}) — {item.meaningVi}
                </span>
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {item.definitionEn}
              </p>
              <p className="text-sm">Ví dụ mới: {item.exampleEn}</p>
              <Source
                segmentIds={item.sourceSegmentIds}
                citations={citations}
                videoId={videoId}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Cụm từ tự nhiên">
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
              <Source
                segmentIds={item.sourceSegmentIds}
                citations={citations}
                videoId={videoId}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Ngữ pháp">
        <ul className="space-y-4">
          {draft.grammarPoints.map((item) => (
            <li key={item.titleVi} className="space-y-1">
              <p className="font-semibold">{item.titleVi}</p>
              <p className="font-mono text-sm text-[var(--accent)]">
                {item.pattern}
              </p>
              <p className="text-sm">{item.explanationVi}</p>
              <p className="text-sm">Ví dụ: {item.exampleEn}</p>
              <Source
                segmentIds={item.sourceSegmentIds}
                citations={citations}
                videoId={videoId}
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Kiểm tra hiểu nội dung">
        <ol className="space-y-4">
          {draft.comprehensionQuestions.map((item, index) => (
            <li key={item.questionVi} className="space-y-2">
              <p className="font-medium">
                {index + 1}. {item.questionVi}
              </p>
              <ul className="space-y-1 text-sm">
                {item.options.map((option, optionIndex) => (
                  <li key={option}>
                    {String.fromCharCode(65 + optionIndex)}. {option}
                  </li>
                ))}
              </ul>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--accent)]">
                  Xem đáp án
                </summary>
                <p className="mt-1">
                  Đáp án: {String.fromCharCode(65 + item.correctIndex)} —{" "}
                  {item.explanationVi}
                </p>
              </details>
              <Source
                segmentIds={item.sourceSegmentIds}
                citations={citations}
                videoId={videoId}
              />
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Điền từ">
        <ol className="space-y-3">
          {draft.clozeItems.map((item) => (
            <li key={item.sentence} className="space-y-1">
              <p className="text-sm">{item.sentence}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Gợi ý: {item.hintVi}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-[var(--accent)]">
                  Xem đáp án
                </summary>
                <p className="mt-1">{item.answer}</p>
              </details>
              <Source
                segmentIds={item.sourceSegmentIds}
                citations={citations}
                videoId={videoId}
              />
            </li>
          ))}
        </ol>
      </Section>

      <p className="text-xs text-[var(--muted-foreground)]">
        Mọi câu trích dẫn được lấy trực tiếp từ lời thoại trong video.
      </p>
    </div>
  );
}
