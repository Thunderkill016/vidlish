import "server-only";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createLessonVersionRepository } from "@/platform/learning/create-learning-authoring-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * Which lesson a learner should land on for a job.
 *
 * Decided in one place on purpose. The v1 page sends the learner to the v2
 * session when a blueprint exists, and the v2 session sends them back when it
 * cannot render — two pages, one question, and if they answer it differently
 * the learner bounces between them forever. A blueprint with no transcript is
 * exactly that case: v1 sees the blueprint and forwards, v2 finds no transcript
 * and returns.
 *
 * So both pages ask this, and neither decides for itself.
 */
export type LearnerLessonRoute =
  | { kind: "v2"; blueprint: LessonBlueprintV2; transcript: CanonicalTranscript }
  | { kind: "v1" };

export async function resolveLearnerLessonRoute(input: {
  ownerUserId: string;
  jobId: string;
}): Promise<LearnerLessonRoute> {
  const published = await createLessonVersionRepository().findForJob({
    ownerUserId: input.ownerUserId,
    jobId: input.jobId,
  });
  if (!published) return { kind: "v1" };

  // The blueprint alone is not enough: the session plays source audio, and the
  // timings for it come from the canonical transcript. Without it there is
  // nothing to play, so the v2 page cannot render and this is not a v2 route.
  const transcript = await createTranscriptRuntime(
    createGenerationRepository(),
  ).repository.findCanonicalForJob(input.ownerUserId, input.jobId);
  if (!transcript) return { kind: "v1" };

  return { kind: "v2", blueprint: published.blueprint, transcript };
}
