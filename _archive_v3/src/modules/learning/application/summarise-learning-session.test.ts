import { describe, expect, it } from "vitest";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createEmptyLearningActivityProgress } from "./learning-runtime-progress";
import { summariseLearningSession } from "./summarise-learning-session";

import type { LearningActivityRuntimeProgress } from "./learning-runtime-progress";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

const blueprint = createGoldenSessionLearningBlueprint();

/** The same lesson with every id renamed, as a learner's own lesson would be. */
function renamed(): LessonBlueprintV2 {
  const map = new Map(
    blueprint.activities.map((activity, index) => [
      activity.id,
      `step_qz${index}`,
    ]),
  );
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (node === null || typeof node !== "object") {
      return typeof node === "string" ? (map.get(node) ?? node) : node;
    }
    return Object.fromEntries(
      Object.entries(node as Record<string, unknown>).map(([key, value]) => [
        key,
        walk(value),
      ]),
    );
  };
  return walk(JSON.parse(JSON.stringify(blueprint))) as LessonBlueprintV2;
}

function progress(
  overrides: Partial<LearningActivityRuntimeProgress>,
): LearningActivityRuntimeProgress {
  return { ...createEmptyLearningActivityProgress(), ...overrides };
}

function attempt(
  verdict: "correct" | "incorrect",
): LearningActivityRuntimeProgress["attempts"][number] {
  const base = correctAttempt();
  return {
    ...base,
    evaluation: { ...base.evaluation, verdict },
  } as unknown as LearningActivityRuntimeProgress["attempts"][number];
}

function correctAttempt(): LearningActivityRuntimeProgress["attempts"][number] {
  return {
    activityId: "any",
    idempotencyKey: "11111111-1111-4111-8111-111111111111",
    evaluation: {
      verdict: "correct",
      goalVi: "Nhớ lại cụm mục tiêu.",
      evidenceVi: "Khớp cụm trong nguồn.",
      nextStepVi: "Dùng lại trong tình huống khác.",
      evidenceRefs: [],
    },
    postAttemptSupport: {},
  } as unknown as LearningActivityRuntimeProgress["attempts"][number];
}

describe("summariseLearningSession", () => {
  it("reads recall and transfer from this lesson, not from fixture names", () => {
    // The screen used to look up `activity_recall` and `activity_transfer` by
    // name. On a learner's own lesson both were always missing, so it told
    // every learner they had not recalled the item — whatever they had done.
    const lesson = renamed();
    const recall = lesson.activities.find(
      (activity) => activity.activityType === "chunk_recall",
    )!;
    const transfer = lesson.activities.find(
      (activity) => activity.activityType === "guided_transfer",
    )!;
    expect(recall.id).not.toBe("activity_recall");

    const summary = summariseLearningSession(lesson, {
      [recall.id]: progress({ attempts: [correctAttempt()] }),
      [transfer.id]: progress({
        attempts: [correctAttempt()],
        selfCheckConfirmed: true,
      }),
    });

    expect(summary.recalledUnaided).toBe(true);
    expect(summary.transferSelfChecked).toBe(true);
  });

  it("does not call a wrong recall a right one", () => {
    // The screen decides from the verdict, so a summariser that ignored it
    // would congratulate a learner who never produced the phrase.
    const lesson = renamed();
    const recall = lesson.activities.find(
      (activity) => activity.activityType === "chunk_recall",
    )!;

    const summary = summariseLearningSession(lesson, {
      [recall.id]: progress({ attempts: [attempt("incorrect")] }),
    });

    expect(summary.recalledUnaided).toBe(false);
  });

  it("says nothing rather than something false about an activity never reached", () => {
    // "Did not recall it" is a claim about the learner. An activity they never
    // got to is not evidence for it.
    const summary = summariseLearningSession(renamed(), {});
    expect(summary.recalledUnaided).toBeNull();
    expect(summary.transferSelfChecked).toBeNull();
  });

  it("compares the first listen with the last one", () => {
    const lesson = renamed();
    const listening = lesson.activities.filter(
      (activity) => activity.evidence.length > 0,
    );
    const first = listening[0]!;
    const last = listening[listening.length - 1]!;

    const summary = summariseLearningSession(lesson, {
      [first.id]: progress({
        playCount: 3,
        openedSupportSteps: ["replay", "context_hint", "english_caption"],
      }),
      [last.id]: progress({ playCount: 1, openedSupportSteps: [] }),
    });

    expect(summary.firstListen).toEqual({
      activityId: first.id,
      plays: 3,
      supportSteps: 3,
    });
    expect(summary.finalListen).toEqual({
      activityId: last.id,
      plays: 1,
      supportSteps: 0,
    });
    expect(summary.supportDelta).toBe(-3);
  });

  it("offers no comparison when the lesson has one listening activity", () => {
    // A difference of nothing is not a difference, and drawing one would be the
    // improvement claim this rule exists to prevent.
    const lesson = renamed();
    const single = {
      ...lesson,
      activities: lesson.activities.filter(
        (activity) => activity.evidence.length > 0,
      ).slice(0, 1),
    } as LessonBlueprintV2;

    const summary = summariseLearningSession(single, {});
    expect(summary.finalListen).toBeNull();
    expect(summary.supportDelta).toBeNull();
  });

  it("totals attempts and support across the whole session", () => {
    const lesson = renamed();
    const [one, two] = lesson.activities;
    const summary = summariseLearningSession(lesson, {
      [one!.id]: progress({
        attempts: [correctAttempt()],
        openedSupportSteps: ["replay", "context_hint"],
      }),
      [two!.id]: progress({
        attempts: [correctAttempt(), correctAttempt()],
        openedSupportSteps: ["replay"],
      }),
    });

    expect(summary.totalAttempts).toBe(3);
    expect(summary.totalSupportSteps).toBe(3);
  });
});
