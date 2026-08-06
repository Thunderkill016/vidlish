import type {
  ActivityAttempt,
  ActivityEvaluation,
  ActivityResponse,
  LearningPhase,
  LessonSession,
} from "@/shared/contracts/lesson-v2";

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
  response: ActivityResponse;
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
    attempt: ActivityAttempt;
    session: LessonSession;
    created: boolean;
  }>;
}
