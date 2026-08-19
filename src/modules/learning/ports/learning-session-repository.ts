import type {
  ActivityEvaluation,
  LearningPhase,
  LessonSession,
} from "@/shared/contracts/lesson-v2";
import type {
  PersistedLearningSupportStep,
  PrivacySafeActivityAttempt,
  PrivacySafeActivityResponse,
  PrivacySafeLearningSupportEvent,
} from "@/shared/contracts/privacy-safe-learning-evidence";

export type StartLearningSessionInput = {
  ownerUserId: string;
  lessonVersionId: string;
  initialPhase: LearningPhase;
  initialActivityId: string;
};

export type RecordLearningAttemptInput = {
  ownerUserId: string;
  sessionId: string;
  activityId: string;
  idempotencyKey: string;
  responseEvidence: PrivacySafeActivityResponse;
  evaluation: ActivityEvaluation;
  nextPhase: LearningPhase;
  nextActivityId: string;
  complete: boolean;
  /**
   * Immutable target item keys from the lesson blueprint. Fake persistence uses
   * these to mirror the database completion trigger. Supabase independently
   * derives the authoritative set from the stored immutable blueprint.
   */
  reviewItemKeys: string[];
};

export type RecordLearningSupportEventInput = {
  ownerUserId: string;
  sessionId: string;
  activityId: string;
  idempotencyKey: string;
} & (
  | {
      eventKind: "playback";
      supportStep?: never;
    }
  | {
      eventKind: "support_opened";
      supportStep: PersistedLearningSupportStep;
    }
);

export interface LearningSessionRepository {
  start(
    input: StartLearningSessionInput,
  ): Promise<{ session: LessonSession; created: boolean }>;

  findOwnedSession(
    sessionId: string,
    ownerUserId: string,
  ): Promise<LessonSession | null>;

  countAttempts(
    sessionId: string,
    activityId: string,
    ownerUserId: string,
  ): Promise<number>;

  recordAttempt(
    input: RecordLearningAttemptInput,
  ): Promise<{
    attempt: PrivacySafeActivityAttempt;
    session: LessonSession;
    created: boolean;
  }>;

  recordSupportEvent(
    input: RecordLearningSupportEventInput,
  ): Promise<{
    event: PrivacySafeLearningSupportEvent;
    created: boolean;
  }>;
}