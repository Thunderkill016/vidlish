import { describe, expect, it } from "vitest";

import {
  SLOW_PLAYBACK_TARGET_RATE,
  chooseSlowPlaybackRate,
} from "./choose-slow-playback-rate";

describe("chooseSlowPlaybackRate", () => {
  it("takes the target rate when the player offers it", () => {
    expect(chooseSlowPlaybackRate([0.25, 0.5, 0.75, 1, 1.5, 2], 1)).toBe(0.75);
  });

  it("takes the closest slower rate when the target is missing", () => {
    // A player offering only halves has no 0.75; 0.5 is the honest answer, not
    // a refusal.
    expect(chooseSlowPlaybackRate([0.5, 1, 2], 1)).toBe(0.5);
  });

  it("prefers the slower rate when two are equally close", () => {
    // 0.5 and 1 are both 0.25 from the target. The learner reached this step
    // because replay and a hint did not get them there, so a tie resolves
    // toward more help. Asserted in both list orders: the answer must not
    // depend on which candidate the fold happens to start from.
    expect(chooseSlowPlaybackRate([0.5, 1], 1.5)).toBe(0.5);
    expect(chooseSlowPlaybackRate([1, 0.5], 1.5)).toBe(0.5);
  });

  it("never returns a rate at or above what is already playing", () => {
    // "Slow down" that speeds the audio up is not the support requested.
    expect(chooseSlowPlaybackRate([1, 1.5, 2], 1)).toBeNull();
    expect(chooseSlowPlaybackRate([0.75, 1], 0.75)).toBeNull();
  });

  it("steps down again from an already slowed rate", () => {
    expect(chooseSlowPlaybackRate([0.25, 0.5, 0.75, 1], 0.75)).toBe(0.5);
  });

  it("returns null when the player reports no rates at all", () => {
    // Some embeds answer with an empty list. Offering the step anyway would
    // spend a support level on nothing.
    expect(chooseSlowPlaybackRate([], 1)).toBeNull();
  });

  it("ignores values that are not usable rates", () => {
    expect(chooseSlowPlaybackRate([0, -1, Number.NaN, 0.5], 1)).toBe(0.5);
  });

  it("targets 0.75 by default", () => {
    expect(SLOW_PLAYBACK_TARGET_RATE).toBe(0.75);
  });
});
