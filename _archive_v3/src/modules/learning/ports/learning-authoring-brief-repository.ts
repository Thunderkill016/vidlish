import type {
  LearningAuthoringBrief,
  VideoLearningProfileV2,
} from "@/shared/contracts/learning-generation-v2";

export type StoredAuthoringBrief = {
  brief: LearningAuthoringBrief;
  videoProfile: VideoLearningProfileV2;
};

/**
 * Where the authoring chain rests between its two model calls.
 *
 * Diagnosis and authoring cannot share one workflow step: two model calls at
 * roughly 25 seconds each overrun the step budget, and the invocation dies
 * without running any error handler. Splitting them needs somewhere to leave
 * the first half's result — and it cannot be the step's return value, because
 * the brief carries English speech from the video and the durable boundary
 * refuses video content.
 */
export interface LearningAuthoringBriefRepository {
  save(input: {
    ownerUserId: string;
    jobId: string;
    brief: LearningAuthoringBrief;
    videoProfile: VideoLearningProfileV2;
  }): Promise<void>;

  findForJob(input: {
    ownerUserId: string;
    jobId: string;
  }): Promise<StoredAuthoringBrief | null>;
}
