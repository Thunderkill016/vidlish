import {
  bindVerifiedLearningMedia,
  type VerifiedLearningMedia,
} from "@/shared/contracts/learning-media";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * Builds playable media for a lesson from the transcript it was authored on.
 *
 * The learning lab has been playing a hand-written fixture, which is fine for a
 * demo and useless for a learner: it points at one video with hardcoded
 * timings. A real lesson has to play the video it was actually made from.
 *
 * Nothing here is new evidence. Every timing comes from the canonical
 * transcript, the same rows the blueprint's citations resolve against, so the
 * player can only ever seek to speech the language gate already permitted.
 */

/**
 * `canonical_caption_match` rather than `human_caption_review`: these timings
 * come from the caption track itself, not from anyone checking them. Claiming
 * human review would be claiming an assurance nobody performed.
 */
const VERIFICATION_METHOD = "canonical_caption_match" as const;

export function deriveLearningMedia(
  blueprint: LessonBlueprintV2,
  transcript: CanonicalTranscript,
  verifiedAt: string,
): VerifiedLearningMedia {
  const segmentById = new Map(
    transcript.segments.map((segment) => [segment.id, segment] as const),
  );

  const segments = blueprint.evidenceCatalog.map((evidence) => {
    const segment = segmentById.get(evidence.segmentId);
    if (!segment) {
      // The blueprint cites a segment this transcript does not contain, so the
      // two disagree about what was said. Playing it would seek to whatever
      // happens to sit at that timestamp.
      throw new Error(
        `Lesson cites a segment missing from the transcript: ${evidence.segmentId}`,
      );
    }
    return {
      segmentId: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
    };
  });

  // Bound through the same function the fixture path uses, so a mismatch in
  // video, transcript hash or evidence range fails here rather than in front of
  // a learner.
  return bindVerifiedLearningMedia(blueprint, {
    kind: "youtube",
    videoId: transcript.videoId,
    transcriptHash: transcript.normalizedHash,
    status: "verified",
    verificationMethod: VERIFICATION_METHOD,
    verifiedAt,
    segments,
  });
}
