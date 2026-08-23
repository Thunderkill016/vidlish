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
    if (activity?.activityType === "guided_transfer") {
      return { sessionId: session.id, activity };
    }
  }

  return null;
}
