// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LessonView } from "@/app/(protected)/lessons/[jobId]/_components/lesson-view";
import { lessonSchema, type Lesson } from "@/shared/contracts/lesson";

const JOB_ID = "11111111-1111-4111-8111-111111111111";
const SEGMENT_ONE = `seg_${"a".repeat(32)}`;
const SEGMENT_TWO = `seg_${"b".repeat(32)}`;

function buildLesson(): Lesson {
  return lessonSchema.parse({
    id: "22222222-2222-4222-8222-222222222222",
    jobId: JOB_ID,
    videoId: "dQw4w9WgXcQ",
    videoTitle: "How to build a better learning habit",
    channelName: "Vidlish Test Channel",
    cefrLevel: "B1",
    draft: {
      titleVi: "Xây dựng thói quen học",
      topicVi: "Thói quen",
      summaryVi: "Tóm tắt tiếng Việt.",
      summaryEn: "English summary.",
      estimatedLevel: "B1",
      difficultyReasonsVi: ["Tốc độ nói vừa phải"],
      vocabulary: Array.from({ length: 6 }, (_, index) => ({
        term: `term${index + 1}`,
        partOfSpeech: "noun",
        meaningVi: `nghĩa ${index + 1}`,
        definitionEn: `definition ${index + 1}`,
        exampleEn: `example ${index + 1}`,
        sourceSegmentIds: [SEGMENT_ONE],
      })),
      phrases: Array.from({ length: 3 }, (_, index) => ({
        phrase: `phrase ${index + 1}`,
        kind: "expression",
        meaningVi: `nghĩa cụm ${index + 1}`,
        usageNoteVi: "Dùng trong hội thoại.",
        sourceSegmentIds: [SEGMENT_TWO],
      })),
      grammarPoints: [
        {
          titleVi: "Hiện tại đơn",
          explanationVi: "Thói quen.",
          pattern: "S + V(s/es)",
          exampleEn: "She reviews her notes.",
          sourceSegmentIds: [SEGMENT_ONE],
        },
      ],
      comprehensionQuestions: Array.from({ length: 3 }, (_, index) => ({
        questionVi: `Câu hỏi ${index + 1}?`,
        options: ["Đáp án đúng", "Phương án B", "Phương án C", "Phương án D"],
        correctIndex: 0,
        explanationVi: `Giải thích ${index + 1}.`,
        sourceSegmentIds: [SEGMENT_ONE],
      })),
      clozeItems: [
        {
          sentence: "I ___ every morning",
          answer: "study",
          hintVi: "Động từ trong câu gốc.",
          sourceSegmentIds: [SEGMENT_ONE],
        },
      ],
    },
    citations: [
      {
        segmentId: SEGMENT_ONE,
        startMs: 12_000,
        endMs: 15_000,
        text: "I study every morning",
      },
      {
        segmentId: SEGMENT_TWO,
        startMs: 30_000,
        endMs: 33_000,
        text: "That is the whole trick",
      },
    ],
    provenance: {
      schemaVersion: "lesson:v1",
      pipelineVersion: "lesson-pipeline:v1",
      promptVersion: "lesson-prompt:fixture",
      modelId: "fixture-lesson-model",
      transcriptHash: "a".repeat(64),
      inputTokens: 10,
      outputTokens: 20,
      generatedAt: "2026-08-18T10:00:00.000Z",
    },
    createdAt: "2026-08-18T10:00:00.000Z",
  });
}

const transcript = [
  { id: SEGMENT_ONE, startMs: 12_000, endMs: 15_000, text: "I study every morning" },
  { id: SEGMENT_TWO, startMs: 30_000, endMs: 33_000, text: "That is the whole trick" },
];

let postMessage: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  postMessage = vi.fn();
  // The player talks to the embed over postMessage; jsdom never loads YouTube,
  // so the frame's window is stubbed to record the commands it is sent.
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    configurable: true,
    get: () => ({ postMessage }),
  });

  fetchMock = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          progress: {
            jobId: JOB_ID,
            lessonId: "22222222-2222-4222-8222-222222222222",
            state: {
              version: "study-progress:v1",
              comprehensionAnswers: [],
              clozeAttempts: [],
              masteredVocabulary: [],
            },
            completedAt: null,
            updatedAt: "2026-08-18T10:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLIFrameElement.prototype, "contentWindow");
});

function renderLesson(
  initialProgress: React.ComponentProps<typeof LessonView>["initialProgress"] = null,
) {
  return render(
    <LessonView
      lesson={buildLesson()}
      transcript={transcript}
      initialProgress={initialProgress}
    />,
  );
}

describe("LessonView study workspace", () => {
  it("grades a comprehension answer once and shows the evidence", async () => {
    const user = userEvent.setup();
    renderLesson();

    const quiz = screen.getByRole("heading", { name: "Kiểm tra hiểu nội dung" })
      .parentElement!.parentElement!;
    const firstQuestion = within(quiz).getByText("1. Câu hỏi 1?").parentElement!;

    await user.click(
      within(firstQuestion).getByRole("button", { name: /Phương án B/ }),
    );

    expect(within(firstQuestion).getByText(/Chưa đúng/)).toBeVisible();
    expect(within(firstQuestion).getByText("Giải thích 1.")).toBeVisible();

    // A second click must not overwrite the recorded answer.
    await user.click(
      within(firstQuestion).getByRole("button", { name: /Đáp án đúng/ }),
    );
    expect(within(firstQuestion).getByText(/Chưa đúng/)).toBeVisible();
  });

  it("checks a typed cloze answer instead of only revealing it", async () => {
    const user = userEvent.setup();
    renderLesson();

    const input = screen.getByLabelText("Điền từ còn thiếu cho câu 1");
    await user.type(input, "sleep");
    await user.click(screen.getByRole("button", { name: "Kiểm tra" }));
    expect(screen.getByTestId("cloze-feedback-0")).toBeVisible();

    await user.clear(input);
    await user.type(input, " Study. ");
    await user.click(screen.getByRole("button", { name: "Kiểm tra" }));
    expect(screen.getByTestId("cloze-result-0")).toHaveTextContent("Chính xác.");
  });

  it("reopens a lesson showing the work already done", () => {
    renderLesson({
      jobId: JOB_ID,
      lessonId: "22222222-2222-4222-8222-222222222222",
      state: {
        version: "study-progress:v1",
        comprehensionAnswers: [{ index: 0, selectedIndex: 0 }],
        clozeAttempts: [{ index: 0, solved: true, revealed: false }],
        masteredVocabulary: [0],
      },
      completedAt: null,
      updatedAt: "2026-08-18T10:00:00.000Z",
    });

    expect(screen.getAllByText("Chính xác.").length).toBe(2);
    // The cloze reads as a finished sentence even though the input is gone.
    expect(screen.getByText("study")).toBeVisible();
    expect(screen.getByTestId("cloze-result-0")).toHaveTextContent("Chính xác.");
    expect(screen.getAllByRole("button", { name: "Đã thuộc" })[0]).toBeVisible();
    expect(screen.getAllByTestId("study-progress")[0]).toHaveTextContent("30%");
  });

  it("plays exactly the cited segment in the embedded player", async () => {
    const user = userEvent.setup();
    renderLesson();

    await user.click(screen.getAllByRole("button", { name: "Nghe câu tại 0:12" })[0]!);

    const commands = postMessage.mock.calls.map(
      (call) => JSON.parse(call[0] as string) as { func: string; args: unknown[] },
    );
    expect(commands[0]).toEqual({
      event: "command",
      func: "seekTo",
      args: [12, true],
    });
    expect(commands.some((command) => command.func === "playVideo")).toBe(true);
  });

  it("saves progress to the owner-scoped endpoint as the learner works", async () => {
    const user = userEvent.setup();
    renderLesson();

    await user.click(
      screen.getAllByRole("button", { name: "Đánh dấu đã thuộc" })[0]!,
    );

    await waitFor(
      () => expect(fetchMock).toHaveBeenCalledWith(
        `/api/lessons/${JOB_ID}/progress`,
        expect.objectContaining({ method: "PUT" }),
      ),
      { timeout: 4000 },
    );

    const body = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string,
    );
    expect(body).toEqual({
      state: {
        version: "study-progress:v1",
        comprehensionAnswers: [],
        clozeAttempts: [],
        masteredVocabulary: [0],
      },
      completed: false,
    });
    await waitFor(() =>
      expect(screen.getAllByTestId("study-save-status")[0]).toHaveTextContent(
        "Đã lưu tiến độ",
      ),
    );
  });

  it("reports a failed save without discarding what is on screen", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 503 }));
    const user = userEvent.setup();
    renderLesson();

    await user.click(
      screen.getAllByRole("button", { name: "Đánh dấu đã thuộc" })[0]!,
    );

    await waitFor(
      () =>
        expect(screen.getAllByTestId("study-save-status")[0]).toHaveTextContent(
          "Chưa lưu được tiến độ",
        ),
      { timeout: 4000 },
    );
    expect(
      screen.getAllByRole("button", { name: "Đã thuộc" }).length,
    ).toBeGreaterThan(0);
  });
});
