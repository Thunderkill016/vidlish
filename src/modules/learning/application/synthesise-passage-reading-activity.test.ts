import { describe, expect, it } from "vitest";

import { synthesisePassageReadingActivity } from "./synthesise-passage-reading-activity";

import type { LearningAuthoringDraftV2 } from "@/shared/contracts/learning-authoring-draft-v2";
import type { LearningAuthoringBrief } from "@/shared/contracts/learning-generation-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const SEG_LISTEN = `seg_${"a".repeat(32)}`;
const SEG_READ = `seg_${"b".repeat(32)}`;
const WINDOW_LISTEN = "window_listening_source";
const WINDOW_READ = "window_reading_source";

function draft(): LearningAuthoringDraftV2 {
  return {
    activities: [
      {
        id: "activity_gist",
        activityType: "gist_choice",
        captionPolicy: "hidden_first",
        evidenceWindowIds: [WINDOW_LISTEN],
      },
    ],
  } as unknown as LearningAuthoringDraftV2;
}

function brief(twoWindows = true): LearningAuthoringBrief {
  const windows = [
    {
      id: WINDOW_LISTEN,
      sourceSegmentIds: [SEG_LISTEN],
      gistVi: "Người nói giới thiệu vấn đề cần hỗ trợ tại nơi làm việc.",
      discourseFunctionVi: "giới thiệu chủ đề",
      evidenceConfidence: 0.95,
    },
  ];
  if (twoWindows) {
    windows.push({
      id: WINDOW_READ,
      sourceSegmentIds: [SEG_READ],
      gistVi: "Người nói giải thích cách xin thêm thời gian một cách lịch sự.",
      discourseFunctionVi: "giải thích cách diễn đạt",
      evidenceConfidence: 0.94,
    });
  }
  return {
    windows,
    outcomes: [
      {
        id: "outcome_main",
        canDoVi: "Nắm được ý chính của một đoạn tiếng Anh ngắn trong nguồn.",
        successEvidenceVi:
          "Chọn đúng ý chính sau khi đọc chính đoạn tiếng Anh trong nguồn.",
      },
    ],
  } as unknown as LearningAuthoringBrief;
}

function transcript(readingText = "You can ask for more time politely when a task needs careful work."): CanonicalTranscript {
  return {
    segments: [
      {
        id: SEG_LISTEN,
        position: 0,
        startMs: 0,
        endMs: 4_000,
        text: "Today we are looking at how people ask for help at work.",
      },
      {
        id: SEG_READ,
        position: 1,
        startMs: 5_000,
        endMs: 9_000,
        text: readingText,
      },
    ],
  } as unknown as CanonicalTranscript;
}

describe("synthesisePassageReadingActivity", () => {
  it("builds a shown gist from a distinct canonical passage without another authoring call", () => {
    const activity = synthesisePassageReadingActivity({
      brief: brief(),
      draft: draft(),
      transcript: transcript(),
      blueprintId: "11111111-1111-4111-8111-111111111112",
    });

    expect(activity?.activityType).toBe("gist_choice");
    if (!activity || activity.activityType !== "gist_choice") return;
    expect(activity.evidence[0]?.sourceSegmentIds).toEqual([SEG_READ]);
    expect(activity.evidence[0]?.captionPolicy).toBe("shown");
    expect(activity.evaluation.correctOptionId).toBe("option_reading_main");
    expect(
      activity.options.find((option) => option.id === "option_reading_main")
        ?.textVi,
    ).toBe("Người nói giải thích cách xin thêm thời gian một cách lịch sự.");
  });

  it("does not fabricate passage reading for a one-window lesson", () => {
    expect(
      synthesisePassageReadingActivity({
        brief: brief(false),
        draft: draft(),
        transcript: transcript(),
        blueprintId: "11111111-1111-4111-8111-111111111112",
      }),
    ).toBeNull();
  });

  it("refuses text too short to count as passage comprehension", () => {
    expect(
      synthesisePassageReadingActivity({
        brief: brief(),
        draft: draft(),
        transcript: transcript("Ask for time."),
        blueprintId: "11111111-1111-4111-8111-111111111112",
      }),
    ).toBeNull();
  });

  it("is deterministic for the same blueprint id", () => {
    const input = {
      brief: brief(),
      draft: draft(),
      transcript: transcript(),
      blueprintId: "11111111-1111-4111-8111-111111111113",
    };
    expect(synthesisePassageReadingActivity(input)).toEqual(
      synthesisePassageReadingActivity(input),
    );
  });
});
