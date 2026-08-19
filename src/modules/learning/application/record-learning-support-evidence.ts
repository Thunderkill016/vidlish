import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import {
  canUseSupportStep,
  type LearningRuntimePolicyV2,
  type SupportStep,
} from "@/shared/contracts/learning-policy-v2";

export class LearningSupportEvidenceError extends Error {
  readonly name = "LearningSupportEvidenceError";
}

type SupportEvidenceInput = {
  ownerUserId: string;
  sessionId: string;
  blueprint: LessonBlueprintV2;
  policy: LearningRuntimePolicyV2;
  activityId: string;
  idempotencyKey: string;
} & (
  | { eventKind: "playback" }
  | {
      eventKind: "support_opened";
      supportStep: Exclude<SupportStep, "replay">;
    }
);

export class RecordLearningSupportEvidence {
  constructor(private readonly repository: LearningSessionRepository) {}

  async execute(input: SupportEvidenceInput) {
    const session = await this.repository.findOwnedSession(
      input.sessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new LearningSupportEvidenceError("Learning session was not found.");
    }

    if (input.policy.blueprintId !== input.blueprint.blueprintId) {
      throw new LearningSupportEvidenceError(
        "Learning runtime policy does not belong to this lesson blueprint.",
      );
    }

    const activity = input.blueprint.activities.find(
      (candidate) => candidate.id === input.activityId,
    );
    if (!activity) {
      throw new LearningSupportEvidenceError(
        "Activity does not belong to this lesson blueprint.",
      );
    }

    const activityPolicy = input.policy.activityPolicies.find(
      (candidate) => candidate.activityId === input.activityId,
    );
    if (!activityPolicy) {
      throw new LearningSupportEvidenceError(
        "Activity has no learning runtime policy.",
      );
    }

    if (input.eventKind === "playback") {
      if (activity.evidence.length === 0) {
        throw new LearningSupportEvidenceError(
          "Playback evidence requires a bounded source range.",
        );
      }
      return this.repository.recordSupportEvent({
        ownerUserId: input.ownerUserId,
        sessionId: input.sessionId,
        activityId: input.activityId,
        idempotencyKey: input.idempotencyKey,
        eventKind: "playback",
      });
    }

    if (!activityPolicy.support) {
      throw new LearningSupportEvidenceError(
        "This activity has no progressive support ladder.",
      );
    }

    const attemptCount = await this.repository.countAttempts(
      input.sessionId,
      input.activityId,
      input.ownerUserId,
    );
    if (
      !canUseSupportStep(
        activityPolicy.support,
        input.supportStep,
        attemptCount,
      )
    ) {
      throw new LearningSupportEvidenceError(
        "This support step is not available at the current attempt boundary.",
      );
    }

    return this.repository.recordSupportEvent({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: input.idempotencyKey,
      eventKind: "support_opened",
      supportStep: input.supportStep,
    });
  }
}
