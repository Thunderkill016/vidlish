import { describe, expect, it } from "vitest";

import { deriveLearningMedia } from "./derive-learning-media";

import { createFixtureLearningBlueprint } from "@/adapters/fake/fixture-learning-blueprint";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

const VERIFIED_AT = "2026-08-20T09:00:00+00:00";

function transcriptFor(blueprint: LessonBlueprintV2): CanonicalTranscript {
  return {
    videoId: blueprint.source.videoId,
    strategyId: "supadata-native-caption",
    provider: "supadata",
    sourceType: "native_caption",
    declaredLanguage: "en",
    availableLanguages: ["en"],
    trackKind: "manual",
    translationStatus: "original",
    normalizedHash: blueprint.source.transcriptHash,
    normalizationVersion: "transcript-normalization:v1",
    durationMs: blueprint.videoProfile.durationMs,
    segments: blueprint.evidenceCatalog.map((evidence, index) => ({
      id: evidence.segmentId,
      position: index,
      startMs: evidence.startMs,
      endMs: evidence.endMs,
      text: evidence.text,
      confidence: 0.99,
      detectedLanguage: "en" as const,
    })),
  };
}

describe("deriveLearningMedia", () => {
  it("plays the video the lesson was actually made from", () => {
    // The fixture media points at one hardcoded video. A real lesson has to
    // play its own source or the learner is listening to something else.
    const blueprint = createFixtureLearningBlueprint();
    const media = deriveLearningMedia(
      blueprint,
      transcriptFor(blueprint),
      VERIFIED_AT,
    );

    expect(media.videoId).toBe(blueprint.source.videoId);
    expect(media.transcriptHash).toBe(blueprint.source.transcriptHash);
  });

  it("binds exactly the segments the lesson cites, no more", () => {
    // A transcript usually holds far more speech than a lesson quotes. Binding
    // the whole thing would hand the player ranges the lesson never cited.
    //
    // An earlier version of this test compared media timings against transcript
    // timings, which can never fail: hydration builds the evidence catalog from
    // those same segments, so the two agree by construction. Sabotaging the
    // implementation proved it bit nothing.
    const blueprint = createFixtureLearningBlueprint();
    const transcript = transcriptFor(blueprint);
    const withExtra: typeof transcript = {
      ...transcript,
      segments: [
        ...transcript.segments,
        {
          id: `seg_${"c".repeat(32)}`,
          position: transcript.segments.length,
          startMs: 900_000,
          endMs: 906_000,
          text: "Speech the lesson never cites.",
          confidence: 0.99,
          detectedLanguage: "en" as const,
        },
      ],
    };

    const media = deriveLearningMedia(blueprint, withExtra, VERIFIED_AT);

    expect(media.segments.map((segment) => segment.segmentId).sort()).toEqual(
      blueprint.evidenceCatalog.map((evidence) => evidence.segmentId).sort(),
    );
  });

  it("claims only the assurance that was actually performed", () => {
    // Nobody reviewed these captions by hand. Saying otherwise would put a
    // human-verified label on an automated match.
    const blueprint = createFixtureLearningBlueprint();
    const media = deriveLearningMedia(
      blueprint,
      transcriptFor(blueprint),
      VERIFIED_AT,
    );
    expect(media.verificationMethod).toBe("canonical_caption_match");
  });

  it("refuses a transcript missing a cited segment", () => {
    const blueprint = createFixtureLearningBlueprint();
    const transcript = transcriptFor(blueprint);
    const short = { ...transcript, segments: transcript.segments.slice(1) };

    expect(() => deriveLearningMedia(blueprint, short, VERIFIED_AT)).toThrow(
      /missing from the transcript/i,
    );
  });

  it("refuses a transcript for a different video", () => {
    // Segment ids would still resolve, to entirely different speech.
    const blueprint = createFixtureLearningBlueprint();
    const other = { ...transcriptFor(blueprint), videoId: "dQw4w9WgXcQ" };

    expect(() => deriveLearningMedia(blueprint, other, VERIFIED_AT)).toThrow();
  });

  it("refuses a transcript whose hash does not match the lesson", () => {
    const blueprint = createFixtureLearningBlueprint();
    const edited = {
      ...transcriptFor(blueprint),
      normalizedHash: "e".repeat(64),
    };

    expect(() => deriveLearningMedia(blueprint, edited, VERIFIED_AT)).toThrow();
  });
});
