import { describe, expect, it } from "vitest";

import { selectLearningPlaybackRate } from "@/modules/video/domain/select-learning-playback-rate";

describe("selectLearningPlaybackRate", () => {
  it("prefers 0.75x when YouTube exposes it", () => {
    expect(selectLearningPlaybackRate([0.25, 0.5, 0.75, 1, 1.5, 2])).toBe(0.75);
  });

  it("falls back to the closest supported slower rate", () => {
    expect(selectLearningPlaybackRate([0.6, 1, 1.25])).toBe(0.6);
  });

  it("uses normal speed when variable playback is unavailable", () => {
    expect(selectLearningPlaybackRate([1])).toBe(1);
    expect(selectLearningPlaybackRate([])).toBe(1);
  });
});
