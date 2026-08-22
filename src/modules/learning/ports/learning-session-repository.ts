import type {
  ActivityEvaluation,
  LearningPhase,
  LessonSession,
} from "@/shared/contracts/lesson-v2";
import type {
  LearningProductEventKind,
  LearningRuntimeErrorKind,
  PrivacySafeLearningProductEvent,
} from "@/shared/contracts/learning-product-events";
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

export type RecordLearningProductEventInput = {
  ownerUserId: string;
  sessionId: string;
  activityId: string;
  idempotencyKey: string;
} & (
  | {
      eventKind: Exclude<LearningProductEventKind, "runtime_error">;
      detailKind?: never;
    }
  | {
      eventKind: "runtime_error";
      detailKind: LearningRuntimeErrorKind;
    }
);

export type LearningActivityDurableProgress = {
  activityId: string;
  playbackCount: number;
  attemptCount: number;
  /** In the order the learner opened them. */
  openedSupportSteps: readonly PersistedLearningSupportStep[];
};

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

  /**
   * How many attempts this session already holds for an activity.
   *
   * The server needs it to apply the same attempt limit the browser displays;
   * without it the two disagree about when a learner may move on.
   */
  countActivityAttempts(input: {
    ownerUserId: string;
    sessionId: string;
    activityId: string;
  }): Promise<number>;

  /**
   * What this session durably records for each of its activities.
   *
   * VLR-103. Support state was restored from the browser alone, so a learner
   * returning on another device — or after clearing storage — was shown an
   * untouched support ladder while the server already held the caption they had
   * opened. The two disagreed about what help the learner had been given, and
   * the browser's answer was the one on screen.
   */
  findSessionProgress(input: {
    ownerUserId: string;
    sessionId: string;
  }): Promise<readonly LearningActivityDurableProgress[]>;

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

  /**
   * Product-observation evidence that cannot be reconstructed from attempts,
   * support rows or session state. These rows never update learning capability.
   */
  recordProductEvent(
    input: RecordLearningProductEventInput,
  ): Promise<{
    event: PrivacySafeLearningProductEvent;
    created: boolean;
  }>;

  listProductEvents(input: {
    ownerUserId: string;
    sessionId: string;
  }): Promise<readonly PrivacySafeLearningProductEvent[]>;
}
