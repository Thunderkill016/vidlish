import { describe, expect, it } from "vitest";
import {
  leastServedStrand,
  resolveNextLearningAction,
  type NextActionInput,
  type StrandBudget,
} from "./resolve-next-learning-action";

const noneServed: StrandBudget = {
  meaning_focused_input: 0,
  meaning_focused_output: 0,
  language_focused: 0,
  fluency_development: 0,
};

const base: NextActionInput = {
  dueReviews: [],
  dueSpeaking: [],
  unitActivities: [],
  newWordAvailable: false,
  servedToday: noneServed,
};

describe("resolveNextLearningAction", () => {
  it("puts a due review ahead of everything else", () => {
    // Skipping a due review does not delay the item, it loses it.
    expect(
      resolveNextLearningAction({
        ...base,
        dueReviews: ["water"],
        dueSpeaking: ["cat"],
        unitActivities: [
          { unitId: "u", activityId: "a", strand: "meaning_focused_input" },
        ],
        newWordAvailable: true,
      }),
    ).toEqual({ kind: "review_due", itemKey: "water", strand: "language_focused" });
  });

  it("puts due speaking ahead of new material", () => {
    expect(
      resolveNextLearningAction({
        ...base,
        dueSpeaking: ["cat"],
        newWordAvailable: true,
      }),
    ).toMatchObject({ kind: "speak_due", itemKey: "cat" });
  });

  it("works the unit before introducing anything new", () => {
    expect(
      resolveNextLearningAction({
        ...base,
        unitActivities: [
          { unitId: "intro", activityId: "listen", strand: "meaning_focused_input" },
        ],
        newWordAvailable: true,
      }),
    ).toMatchObject({ kind: "unit_activity", activityId: "listen" });
  });

  it("picks the strand that has had least attention today", () => {
    // The balance rule as runtime behaviour, not just a schema check: a learner
    // who reaches for the same kind of work every day ends up with a lopsided
    // course even when the syllabus is balanced.
    const action = resolveNextLearningAction({
      ...base,
      unitActivities: [
        { unitId: "u", activityId: "study", strand: "language_focused" },
        { unitId: "u", activityId: "say-it", strand: "meaning_focused_output" },
      ],
      servedToday: { ...noneServed, language_focused: 3 },
    });

    expect(action).toMatchObject({ activityId: "say-it" });
  });

  it("keeps the unit's own order when no strand is behind", () => {
    const action = resolveNextLearningAction({
      ...base,
      unitActivities: [
        { unitId: "u", activityId: "listen", strand: "meaning_focused_input" },
        { unitId: "u", activityId: "say-it", strand: "meaning_focused_output" },
      ],
    });

    expect(action).toMatchObject({ activityId: "listen" });
  });

  it("introduces a new word only when nothing is owed", () => {
    expect(
      resolveNextLearningAction({ ...base, newWordAvailable: true }),
    ).toEqual({ kind: "new_word", strand: "language_focused" });
  });

  it("says the day is done rather than inventing work", () => {
    // A product that always has something for you cannot tell you when you are
    // finished, and a learner who is never finished stops believing it.
    expect(resolveNextLearningAction(base)).toEqual({
      kind: "rest",
      reason: "nothing_due_today",
    });
  });
});

describe("leastServedStrand", () => {
  it("returns null when there is nothing to choose between", () => {
    expect(leastServedStrand(noneServed, [])).toBeNull();
  });

  it("prefers the strand with the smallest count", () => {
    expect(
      leastServedStrand(
        { ...noneServed, language_focused: 2, fluency_development: 1 },
        ["language_focused", "fluency_development"],
      ),
    ).toBe("fluency_development");
  });

  it("keeps the first candidate when counts tie, so the order is stable", () => {
    expect(
      leastServedStrand(noneServed, [
        "meaning_focused_input",
        "meaning_focused_output",
      ]),
    ).toBe("meaning_focused_input");
  });
});
