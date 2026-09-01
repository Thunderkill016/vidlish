import { describe, expect, it } from "vitest";

import {
  segmentIntoTopicUnits,
  selectTeachableUnit,
} from "./topic-segmentation";
import type { TopicUnit, TranscriptLikeSegment } from "./topic-segmentation";

/**
 * Builds a run of segments on one topic. Each segment is 10 seconds with no
 * pause between them, so duration is predictable and the only varying signal is
 * vocabulary — which is what these tests are about.
 */
function run(
  topicWords: string,
  count: number,
  startMs: number,
  prefix: string,
): TranscriptLikeSegment[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `seg_${prefix}${String(index).padStart(3, "0")}`,
    text: topicWords,
    startMs: startMs + index * 10_000,
    endMs: startMs + index * 10_000 + 10_000,
  }));
}

const COOKING = "we sear the salmon then reduce the butter sauce in the pan";
const ASTRONOMY = "the telescope resolves distant galaxies beyond the nebula cluster";

describe("segmentIntoTopicUnits", () => {
  it("returns nothing for an empty transcript", () => {
    expect(segmentIntoTopicUnits([])).toEqual([]);
  });

  it("keeps a short video as a single unit", () => {
    //90 seconds total, below the two-minute floor — cutting it would produce
    // units too short to be a session.
    const units = segmentIntoTopicUnits(run(COOKING, 9, 0, "a"));
    expect(units).toHaveLength(1);
    expect(units[0]!.segmentIds).toHaveLength(9);
  });

  it("cuts where the vocabulary changes topic", () => {
    // Five minutes of cooking followed by five minutes of astronomy. The only
    // boundary signal is the words themselves.
    const segments = [
      ...run(COOKING, 30, 0, "a"),
      ...run(ASTRONOMY, 30, 300_000, "b"),
    ];
    const units = segmentIntoTopicUnits(segments, { maxMs: 400_000 });

    expect(units.length).toBeGreaterThan(1);
    // The cut should land at the topic change, not at an arbitrary offset.
    expect(units[0]!.endMs).toBe(300_000);
    expect(units[1]!.segmentIds[0]).toBe("seg_b000");
  });

  it("never emits a unit longer than the ceiling", () => {
    // One unbroken topic for 20 minutes: cohesion never drops, so only the
    // ceiling can force a cut. An unbounded unit is the failure this prevents.
    const units = segmentIntoTopicUnits(run(COOKING, 120, 0, "a"), {
      maxMs: 300_000,
    });
    for (const unit of units) {
      expect(unit.endMs - unit.startMs).toBeLessThanOrEqual(300_000);
    }
    expect(units.length).toBeGreaterThan(1);
  });

  it("never emits a unit shorter than the floor, except the final tail", () => {
    const units = segmentIntoTopicUnits(
      [...run(COOKING, 30, 0, "a"), ...run(ASTRONOMY, 30, 300_000, "b")],
      { minMs: 120_000, maxMs: 400_000 },
    );
    for (const unit of units.slice(0, -1)) {
      expect(unit.endMs - unit.startMs).toBeGreaterThanOrEqual(120_000);
    }
  });

  it("covers every segment exactly once, in order", () => {
    // A unit boundary that drops or duplicates a segment would silently lose
    // transcript, and grounding depends on every citation still resolving.
    const segments = [
      ...run(COOKING, 30, 0, "a"),
      ...run(ASTRONOMY, 30, 300_000, "b"),
      ...run(COOKING, 30, 600_000, "c"),
    ];
    const units = segmentIntoTopicUnits(segments, { maxMs: 400_000 });
    expect(units.flatMap((unit) => unit.segmentIds)).toEqual(
      segments.map((segment) => segment.id),
    );
  });

  it("treats a long pause as a boundary signal", () => {
    // Same topic throughout, so vocabulary gives no signal at all. Only the
    // silence marks the break.
    const before = run(COOKING, 20, 0, "a");
    const after = run(COOKING, 20, 210_000, "b"); // 10s gap after the 200s mark
    const units = segmentIntoTopicUnits([...before, ...after], {
      minMs: 60_000,
      maxMs: 250_000,
    });
    expect(units.length).toBeGreaterThan(1);
    expect(units[0]!.endMs).toBe(200_000);
  });

  it("measures coverage per unit, so a hard chapter is visible", () => {
    // One unit of common words, one of rare ones. A single number for the whole
    // video would average these into something true of neither.
    const easy = run("we can go to the house and look at the water", 30, 0, "a");
    const hard = run(
      "perspicacious antediluvian obfuscation precipitates quixotic",
      30,
      300_000,
      "b",
    );
    const units = segmentIntoTopicUnits([...easy, ...hard], {
      maxMs: 400_000,
      cefrLevel: "B1",
    });
    expect(units).toHaveLength(2);
    expect(units[0]!.lexicalCoverage).toBeGreaterThan(
      units[1]!.lexicalCoverage!,
    );
  });

  it("counts running words per unit", () => {
    const units = segmentIntoTopicUnits(run("one two three", 9, 0, "a"));
    expect(units[0]!.wordCount).toBe(27);
  });
});

describe("selectTeachableUnit", () => {
  const unit = (id: string, lexicalCoverage: number | null): TopicUnit => ({
    segmentIds: [id],
    startMs: 0,
    endMs: 120_000,
    wordCount: 100,
    lexicalCoverage,
  });

  it("returns nothing when there are no units", () => {
    expect(selectTeachableUnit([])).toBeNull();
  });

  it("takes the hardest chapter still within reach, not the easiest", () => {
    // The 99% chapter is the one the learner already understands — teaching from
    // it would spend the whole budget on nothing new. The 91% chapter is where
    // unfamiliar material sits close enough to be picked up.
    const picked = selectTeachableUnit([
      unit("easy", 0.99),
      unit("reachable", 0.91),
      unit("impossible", 0.62),
    ]);
    expect(picked?.segmentIds).toEqual(["reachable"]);
  });

  it("still returns a unit when nothing clears the band", () => {
    // Coverage must never be the thing that tells a learner no — the estimate is
    // far too rough to carry a refusal.
    const picked = selectTeachableUnit([unit("hard", 0.55), unit("less", 0.71)]);
    expect(picked?.segmentIds).toEqual(["less"]);
  });

  it("treats an unmeasurable unit as reachable rather than dropping it", () => {
    // Silence about a unit is not evidence against it.
    const picked = selectTeachableUnit([unit("unknown", null)]);
    expect(picked?.segmentIds).toEqual(["unknown"]);
  });
});
