import { createLearnerBlueprintView } from "./create-learner-blueprint-view";

import { lessonBlueprintV2Schema } from "@/shared/contracts/lesson-v2";

export type SpeakingPracticeSessionCandidate = {
  id: string;
  lessonVersionId: string;
};

export type SelectedSpeakingPractice = {
  sessionId: string;
  activity: Extract<
    ReturnType<typeof createLearnerBlueprintView>["activities"][number],
    { activityType: "guided_transfer" }
  >;
  /**
   * Bounded post-attempt support selected on the server from the immutable
   * blueprint. It stays separate from the learner activity view so generic
   * lesson rendering cannot reveal evaluation/reveal material before attempt.
   */
  exemplarAfterAttempt: string | null;
  /**
   * Immutable target surfaces used only by the optional on-device ASR probe.
   * They are never a verifier result and are not persisted as learner evidence.
   */
  recognitionTargetPhrases: string[];
};

/**
 * Select a speaking prompt from completed, owner-scoped session data.
 *
 * If a specific session was requested, failure to resolve that session is a
 * hard null. We never jump to another completed lesson merely because it has a
 * convenient transfer prompt; that would make the UI claim it continued the
 * just-finished lesson while persisting evidence against a different one.
 */
export function selectSpeakingPractice(input: {
  sessions: SpeakingPracticeSessionCandidate[];
  blueprintsByVersion: ReadonlyMap<string, unknown>;
  requestedSessionId: string | null;
}): SelectedSpeakingPractice | null {
  const candidates = input.requestedSessionId
    ? input.sessions.filter((session) => session.id === input.requestedSessionId)
    : input.sessions;

  for (const session of candidates) {
    const rawBlueprint = input.blueprintsByVersion.get(session.lessonVersionId);
    if (!rawBlueprint) continue;
    const parsed = lessonBlueprintV2Schema.safeParse(rawBlueprint);
    if (!parsed.success) continue;

    const learnerView = createLearnerBlueprintView(parsed.data);
    const activity = learnerView.activities.find(
      (candidate) => candidate.activityType === "guided_transfer",
    );
    if (activity?.activityType !== "guided_transfer") continue;

    const immutableActivity = parsed.data.activities.find(
      (candidate) =>
        candidate.id === activity.id &&
        candidate.activityType === "guided_transfer",
    );
    if (immutableActivity?.activityType !== "guided_transfer") continue;

    const targetIds = new Set(immutableActivity.targetItemIds);
    const recognitionTargetPhrases = parsed.data.targetItems
      .filter((item) => targetIds.has(item.id))
      .map((item) => item.surfaceForm.trim())
      .filter(Boolean);

    return {
      sessionId: session.id,
      activity,
      exemplarAfterAttempt:
        immutableActivity.evaluation.exemplarAfterAttempt ?? null,
      recognitionTargetPhrases,
    };
  }

  return null;
}
