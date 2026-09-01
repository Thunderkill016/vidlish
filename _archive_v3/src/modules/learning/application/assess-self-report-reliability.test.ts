import { describe, expect, it } from "vitest";
import {
  assessSelfReportReliability,
  FALSE_ALARM_CEILING,
  MIN_NONWORD_TRIALS,
} from "./assess-self-report-reliability";

const word = (item: string, claimedKnown: boolean) => ({
  item,
  isNonword: false,
  claimedKnown,
});
const nonword = (item: string, claimedKnown: boolean) => ({
  item,
  isNonword: true,
  claimedKnown,
});

describe("assessSelfReportReliability", () => {
  it("takes an honest learner at their word", () => {
    const verdict = assessSelfReportReliability([
      word("water", true),
      word("cat", true),
      word("house", false),
      word("river", false),
      nonword("blelf", false),
      nonword("skolf", false),
      nonword("flerm", false),
    ]);

    expect(verdict).toEqual({
      kind: "measured",
      hitRate: 0.5,
      falseAlarmRate: 0,
      corrected: 0.5,
      reliable: true,
    });
  });

  it("discounts a learner who says yes to everything", () => {
    const verdict = assessSelfReportReliability([
      word("water", true),
      word("cat", true),
      nonword("blelf", true),
      nonword("skolf", true),
      nonword("flerm", true),
    ]);

    // Claiming every real word looks like perfect knowledge until the nonwords
    // are read: nothing here says the learner knows anything.
    expect(verdict).toMatchObject({
      hitRate: 1,
      falseAlarmRate: 1,
      corrected: 0,
      reliable: false,
    });
  });

  it("removes the guessing rather than the learner", () => {
    // One false alarm in four is a mistake, not a pattern. The score comes down
    // and the session still counts.
    const verdict = assessSelfReportReliability([
      word("water", true),
      word("cat", true),
      word("house", true),
      word("river", false),
      nonword("blelf", true),
      nonword("skolf", false),
      nonword("flerm", false),
      nonword("plaff", false),
    ]);

    expect(verdict).toMatchObject({ falseAlarmRate: 0.25, reliable: true });
    // (0.75 - 0.25) / (1 - 0.25)
    expect((verdict as { corrected: number }).corrected).toBeCloseTo(0.667, 3);
  });

  it("refuses to score a check with too few nonwords", () => {
    // With one nonword the false-alarm rate can only be 0 or 1, and either
    // would swing the correction across its whole range.
    expect(
      assessSelfReportReliability([word("water", true), nonword("blelf", false)]),
    ).toEqual({ kind: "insufficient", nonwordTrials: 1 });
    expect(MIN_NONWORD_TRIALS).toBe(3);
  });

  it("marks exactly the ceiling as still reliable", () => {
    const trials = [
      word("water", true),
      nonword("blelf", true),
      nonword("skolf", false),
      nonword("flerm", false),
      nonword("plaff", false),
    ];
    const verdict = assessSelfReportReliability(trials);

    expect((verdict as { falseAlarmRate: number }).falseAlarmRate).toBe(
      FALSE_ALARM_CEILING,
    );
    expect(verdict).toMatchObject({ reliable: true });
  });

  it("never reports a negative score for a learner who knew nothing", () => {
    const verdict = assessSelfReportReliability([
      word("water", false),
      nonword("blelf", true),
      nonword("skolf", false),
      nonword("flerm", false),
    ]);

    expect(verdict).toMatchObject({ corrected: 0 });
  });
});
