import "server-only";

import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import { createLearningSessionRepository } from "@/platform/learning/create-learning-session-repository";
import { createLessonVersionRepository } from "@/platform/learning/create-learning-authoring-runtime";
import { resolveLearningLabLessonVersionId } from "@/platform/learning/learning-lab-session-config";

/**
 * The blueprint a request must be graded against.
 *
 * VLR-001 and VLR-002: attempt and support routes were resolving the Golden
 * fixture regardless of which lesson the learner had open. A learner could
 * study a blueprint generated from their own video while the server graded them
 * against a demo — same activity ids by coincidence, entirely different
 * content, and every persisted attempt recorded against the wrong lesson.
 *
 * With a session id, the blueprint comes from the session's own lesson version,
 * owner-scoped at every hop. Without one there is no durable write and no
 * learner lesson to resolve, so the demo blueprint is the honest answer.
 */
export async function resolveSessionBlueprint(input: {
  ownerUserId: string;
  sessionId?: string;
}): Promise<LessonBlueprintV2 | null> {
  if (!input.sessionId) return createGoldenSessionLearningBlueprint();

  const session = await createLearningSessionRepository().findOwnedSession(
    input.sessionId,
    input.ownerUserId,
  );
  // Null rather than a fallback. Falling back here would silently grade a
  // request against the demo when a session lookup failed, which is the defect
  // this function exists to remove.
  if (!session) return null;

  const owned = await createLessonVersionRepository().findByIdForOwner({
    ownerUserId: input.ownerUserId,
    lessonVersionId: session.lessonVersionId,
  });
  if (owned) return owned.blueprint;

  // The demo lab's session points at a configured lesson version that nothing
  // ever published — its blueprint lives in code, not in a row. Narrowed to
  // that exact id on purpose: any other session with no published blueprint is
  // a real learner's, and answering it with a demo is the defect this function
  // exists to remove.
  return session.lessonVersionId === resolveLearningLabLessonVersionId()
    ? createGoldenSessionLearningBlueprint()
    : null;
}
