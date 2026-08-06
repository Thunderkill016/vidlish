import {
  verifiedLearningMediaSchema,
  type VerifiedLearningMedia,
} from "@/shared/contracts/learning-media";

const segA = `seg_${"a".repeat(32)}`;
const segB = `seg_${"b".repeat(32)}`;

/**
 * Caption-aligned media fixture for the public Google for Developers video
 * `M7lc1UVf-VE`. The text itself remains in the canonical evidence catalog;
 * this binding carries only identity and timing.
 */
export function createFixtureLearningMedia(): VerifiedLearningMedia {
  return verifiedLearningMediaSchema.parse({
    kind: "youtube",
    videoId: "M7lc1UVf-VE",
    transcriptHash: "f".repeat(64),
    status: "verified",
    verificationMethod: "human_caption_review",
    verifiedAt: "2026-08-06T10:30:00+00:00",
    segments: [
      {
        segmentId: segA,
        startMs: 16_000,
        endMs: 19_000,
      },
      {
        segmentId: segB,
        startMs: 21_000,
        endMs: 24_000,
      },
    ],
  });
}
