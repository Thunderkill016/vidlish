import type { LearningProductEventRepository } from "@/modules/learning/ports/learning-product-event-repository";
import type { LearningSessionRepository } from "@/modules/learning/ports/learning-session-repository";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";
import type {
  LearningProductEventKind,
  LearningRuntimeErrorKind,
} from "@/shared/contracts/learning-product-events";

export class LearningProductEventError extends Error {
  readonly name = "LearningProductEventError";
}

type ProductEventInput = {
  ownerUserId: string;
  sessionId: string;
  blueprint: LessonBlueprintV2;
  activityId: string;
  idempotencyKey: string;
} & (
  | {
      eventKind: Exclude<LearningProductEventKind, "runtime_error">;
    }
  | {
      eventKind: "runtime_error";
      detailKind: LearningRuntimeErrorKind;
    }
);

export class RecordLearningProductEvent {
  constructor(
    private readonly sessions: LearningSessionRepository,
    private readonly events: LearningProductEventRepository,
  ) {}

  async execute(input: ProductEventInput) {
    const session = await this.sessions.findOwnedSession(
      input.sessionId,
      input.ownerUserId,
    );
    if (!session) {
      throw new LearningProductEventError("Learning session was not found.");
    }

    const activity = input.blueprint.activities.find(
      (candidate) => candidate.id === input.activityId,
    );
    if (!activity) {
      throw new LearningProductEventError(
        "Activity does not belong to this lesson blueprint.",
      );
    }

    if (input.eventKind === "runtime_error") {
      return this.events.record({
        ownerUserId: input.ownerUserId,
        sessionId: input.sessionId,
        activityId: input.activityId,
        idempotencyKey: input.idempotencyKey,
        eventKind: input.eventKind,
        detailKind: input.detailKind,
      });
    }

    if (input.eventKind === "source_play_completed") {
      if (activity.evidence.length === 0) {
        throw new LearningProductEventError(
          "Source completion requires a bounded source range.",
        );
      }
      return this.events.record({
        ownerUserId: input.ownerUserId,
        sessionId: input.sessionId,
        activityId: input.activityId,
        idempotencyKey: input.idempotencyKey,
        eventKind: input.eventKind,
      });
    }

    const attemptCount = await this.sessions.countActivityAttempts({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      activityId: input.activityId,
    });
    if (attemptCount < 1) {
      throw new LearningProductEventError(
        "Correction display requires a persisted attempt first.",
      );
    }
    return this.events.record({
      ownerUserId: input.ownerUserId,
      sessionId: input.sessionId,
      activityId: input.activityId,
      idempotencyKey: input.idempotencyKey,
      eventKind: input.eventKind,
    });
  }
}
