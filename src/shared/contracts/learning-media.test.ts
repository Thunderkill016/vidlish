import { describe, expect, it } from "vitest";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import { createFixtureLearningMedia } from "@/adapters/fake/fixture-learning-media";
import {
  bindVerifiedLearningMedia,
  LearningMediaGroundingError,
} from "@/shared/contracts/learning-media";

describe("bindVerifiedLearningMedia", () => {
  it("binds media only when video, transcript and canonical ranges match", () => {
    const media = bindVerifiedLearningMedia(
      createFixtureLearningBlueprint(),
      createFixtureLearningMedia(),
    );

    expect(media.videoId).toBe("M7lc1UVf-VE");
    expect(JSON.stringify(media)).not.toContain("text");
  });

  it("rejects a real video that is unrelated to the canonical transcript", () => {
    const media = {
      ...createFixtureLearningMedia(),
      videoId: "dQw4w9WgXcQ",
    };

    expect(() =>
      bindVerifiedLearningMedia(createFixtureLearningBlueprint(), media),
    ).toThrow(LearningMediaGroundingError);
  });

  it("rejects a missing verified segment", () => {
    const media = {
      ...createFixtureLearningMedia(),
      segments: createFixtureLearningMedia().segments.slice(0, 1),
    };

    expect(() =>
      bindVerifiedLearningMedia(createFixtureLearningBlueprint(), media),
    ).toThrow(/not verified against playable media/i);
  });

  it("rejects playable timestamps that drift from canonical evidence", () => {
    const media = createFixtureLearningMedia();
    const drifted = {
      ...media,
      segments: media.segments.map((segment, index) =>
        index === 0 ? { ...segment, endMs: segment.endMs + 1_000 } : segment,
      ),
    };

    expect(() =>
      bindVerifiedLearningMedia(createFixtureLearningBlueprint(), drifted),
    ).toThrow(/timestamps differ/i);
  });
});
