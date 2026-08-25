// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { starterItemFor, starterLessonProgressFor } from "@/adapters/vocabulary/starter-catalogue";
import { BeginnerSession } from "@/app/(protected)/start/_components/beginner-session";

const maybeFinalItem = starterItemFor("here");
const maybeFinalLesson = starterLessonProgressFor("here");

if (!maybeFinalItem || !maybeFinalLesson) {
  throw new Error("The first A0 lesson must end with the reviewed `here` item.");
}

const finalItem = maybeFinalItem;
const finalLesson = maybeFinalLesson;

const FINAL_SENTENCE = finalItem.sentences[0];

if (!FINAL_SENTENCE) {
  throw new Error("The final A0 item must have an authored i+1 sentence.");
}

function sessionResponse() {
  return new Response(
    JSON.stringify({
      target: finalItem.word,
      source: "retrieved",
      sentences: [FINAL_SENTENCE],
      knownWordCount: finalLesson.lesson.lastItemOrder - 1,
      learningAsset: finalItem.learningAsset,
      lesson: finalLesson,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function successfulAttemptResponse() {
  return new Response(
    JSON.stringify({
      word: finalItem.word,
      successfulRetrievals: 1,
      known: true,
      dictation: {
        correct: 3,
        total: 3,
        missed: [],
        perfect: true,
      },
    }),
    { status: 201, headers: { "content-type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the first A0 lesson checkpoint", () => {
  it("keeps the final model hidden until an immediate listening and speaking attempt", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === "/api/beginner/session") return sessionResponse();
        if (url === "/api/beginner/attempt") return successfulAttemptResponse();
        if (url.startsWith("/api/beginner/audio")) return new Response(null, { status: 503 });
        throw new Error(`Unexpected request in first-lesson test: ${url}`);
      }),
    );

    render(createElement(BeginnerSession));
    await user.click(screen.getByRole("button", { name: "Bắt đầu nghe" }));

    const recognition = finalItem.learningAsset.recognition;
    const correctMeaning = recognition.options.find(
      (option) => option.id === recognition.correctOptionId,
    );
    if (!correctMeaning) throw new Error("The final item needs a correct meaning option.");

    // The single authored sentence returns three times inside a short session
    // before the lesson's changed-context use and final check become reachable.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await user.click(screen.getByRole("button", { name: correctMeaning.textVi }));
      await user.clear(screen.getByLabelText("Câu bạn nghe được"));
      await user.type(screen.getByLabelText("Câu bạn nghe được"), FINAL_SENTENCE.text);
      await user.click(screen.getByRole("button", { name: "Kiểm tra" }));
      await screen.findByTestId("dictation-result");
      await user.click(screen.getByRole("button", { name: "Câu tiếp theo" }));
    }

    await user.click(screen.getByRole("button", { name: "Đến thử cuối bài" }));
    expect(await screen.findByTestId("a0-lesson-checkpoint")).toBeVisible();
    expect(screen.queryByText(finalLesson.lesson.checkpoint.expectedText, { exact: true })).toBeNull();

    const finalRecognition = finalLesson.lesson.checkpoint.recognition;
    if (!finalRecognition) throw new Error("The first lesson needs an immediate listening check.");
    const finalCorrectMeaning = finalRecognition.options.find(
      (option) => option.id === finalRecognition.correctOptionId,
    );
    if (!finalCorrectMeaning) throw new Error("The checkpoint needs a correct listening option.");

    await user.click(screen.getByRole("button", { name: finalCorrectMeaning.textVi }));
    await user.click(screen.getByRole("button", { name: "Tôi đã thử nói không nhìn mẫu" }));
    expect(screen.queryByText(finalLesson.lesson.checkpoint.expectedText, { exact: true })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Xem mẫu để đối chiếu" }));
    expect(screen.getByText(finalLesson.lesson.checkpoint.expectedText, { exact: true })).toBeVisible();
    expect(
      screen.getByText(/không phải điểm nói hay bằng chứng bạn đã nhớ lâu/),
    ).toBeVisible();
  });
});
