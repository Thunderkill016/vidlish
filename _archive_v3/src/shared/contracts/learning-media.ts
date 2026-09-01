import { z } from "zod";

import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import { videoIdSchema } from "@/shared/contracts/video";

const segmentIdSchema = z.string().regex(/^seg_[a-f0-9]{32}$/);
const offsetDateTimeSchema = z.string().datetime({ offset: true });

const verifiedMediaSegmentSchema = z
  .object({
    segmentId: segmentIdSchema,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
  })
  .strict()
  .refine((value) => value.endMs > value.startMs, {
    message: "Verified media segment must end after it starts.",
    path: ["endMs"],
  });

export const verifiedLearningMediaSchema = z
  .object({
    kind: z.literal("youtube"),
    videoId: videoIdSchema,
    transcriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    status: z.literal("verified"),
    verificationMethod: z.enum([
      "canonical_caption_match",
      "human_caption_review",
    ]),
    verifiedAt: offsetDateTimeSchema,
    segments: z.array(verifiedMediaSegmentSchema).min(1).max(40),
  })
  .strict()
  .superRefine((value, context) => {
    const ids = new Set<string>();
    for (const [index, segment] of value.segments.entries()) {
      if (ids.has(segment.segmentId)) {
        context.addIssue({
          code: "custom",
          path: ["segments", index, "segmentId"],
          message: "Verified media segment IDs must be unique.",
        });
      }
      ids.add(segment.segmentId);
    }
  });

export type VerifiedLearningMedia = z.infer<
  typeof verifiedLearningMediaSchema
>;

export class LearningMediaGroundingError extends Error {
  readonly name = "LearningMediaGroundingError";
}

/**
 * Binds a lesson blueprint to playable source media only when the media was
 * verified against the same canonical transcript and every evidence range.
 *
 * The binding deliberately contains no transcript text or answer contract, so
 * it is safe to send to the learner-facing player before an attempt.
 */
export function bindVerifiedLearningMedia(
  blueprint: LessonBlueprintV2,
  rawMedia: unknown,
): VerifiedLearningMedia {
  const media = verifiedLearningMediaSchema.parse(rawMedia);

  if (media.videoId !== blueprint.source.videoId) {
    throw new LearningMediaGroundingError(
      "Verified media video ID does not match the lesson source.",
    );
  }
  if (media.transcriptHash !== blueprint.source.transcriptHash) {
    throw new LearningMediaGroundingError(
      "Verified media transcript hash does not match the lesson source.",
    );
  }

  const verifiedById = new Map(
    media.segments.map((segment) => [segment.segmentId, segment]),
  );

  for (const evidence of blueprint.evidenceCatalog) {
    const verified = verifiedById.get(evidence.segmentId);
    if (!verified) {
      throw new LearningMediaGroundingError(
        `Source evidence is not verified against playable media: ${evidence.segmentId}`,
      );
    }
    if (
      verified.startMs !== evidence.startMs ||
      verified.endMs !== evidence.endMs
    ) {
      throw new LearningMediaGroundingError(
        `Playable media timestamps differ from canonical evidence: ${evidence.segmentId}`,
      );
    }
  }

  for (const activity of blueprint.activities) {
    for (const reference of activity.evidence) {
      const verified = reference.sourceSegmentIds.map((segmentId) => {
        const segment = verifiedById.get(segmentId);
        if (!segment) {
          throw new LearningMediaGroundingError(
            `Activity cites media that was not verified: ${segmentId}`,
          );
        }
        return segment;
      });
      const expectedStart = Math.min(...verified.map((segment) => segment.startMs));
      const expectedEnd = Math.max(...verified.map((segment) => segment.endMs));
      if (
        reference.startMs !== expectedStart ||
        reference.endMs !== expectedEnd
      ) {
        throw new LearningMediaGroundingError(
          `Activity evidence range is broader or narrower than its canonical segments: ${activity.id}`,
        );
      }
    }
  }

  return media;
}
