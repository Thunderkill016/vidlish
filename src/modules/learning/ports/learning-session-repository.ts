import type {
  ActivityEvaluation,
  LearningPhase,
  LessonSession,
} from "@/shared/contracts/lesson-v2";
import type {
  PrivacySafeActivityAttempt,
  PrivacySafeActivityResponse,
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
};

export interface LearningSessionRepository {
  start(
    input: StartLearningSessionInput,
  ): Promise<{ session: LessonSession; created: boolean }>;

  findOwnedSession(
    sessionId: string,
    ownerUserId: string,
  ): Promise<LessonSession | null>;

  recordAttempt(
    input: RecordLearningAttemptInput,
  ): Promise<{
    attempt: PrivacySafeActivityAttempt;
    session: LessonSession;
    created: boolean;
  }>;
}
