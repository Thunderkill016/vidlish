import type { PlayableVideoMetadata } from "@/shared/contracts/video";
import type {
  GenerationJob,
  GenerationJobStatus,
  GenerationSafeErrorCode,
} from "@/shared/contracts/generation";
import type { CefrLevel } from "@/shared/contracts/lesson-draft";

export type GenerationPolicySnapshot = {
  activeJobCount: number;
  jobsCreatedToday: number;
  jobsCreatedLastMinute: number;
};

export type ActiveGenerationJobKey = {
  ownerUserId: string;
  videoId: string;
  cefrLevel: CefrLevel;
  pipelineVersion: GenerationJob["pipelineVersion"];
};

export type CreateGenerationJobRecord = {
  ownerUserId: string;
  cefrLevel: CefrLevel;
  metadata: PlayableVideoMetadata;
  pipelineVersion: GenerationJob["pipelineVersion"];
};

export interface GenerationJobRepository {
  findActive(input: ActiveGenerationJobKey): Promise<GenerationJob | null>;
  /** Jobs still running, newest first. A learner who navigates away needs a
   *  way back to one; without it the job keeps running and they cannot see it. */
  listActiveOwned(ownerUserId: string): Promise<GenerationJob[]>;
  getPolicySnapshot(ownerUserId: string): Promise<GenerationPolicySnapshot>;
  createOrReuse(
    input: CreateGenerationJobRecord,
  ): Promise<{ job: GenerationJob; created: boolean }>;
  findOwnedById(jobId: string, ownerUserId: string): Promise<GenerationJob | null>;
  beginTranscriptAcquisition(jobId: string): Promise<GenerationJob | null>;
  /**
   * Terminal outcome for a source we could not obtain. Idempotent: the durable
   * workflow and the watchdog may both reach it for the same job, and a job that
   * already reached a terminal state keeps its original outcome.
   */
  markTranscriptExhausted(
    jobId: string,
    ownerUserId: string,
    reason: string,
  ): Promise<GenerationJob | null>;
  markDispatch(
    jobId: string,
    status: "sent" | "failed",
  ): Promise<void>;
  updateStatus(
    jobId: string,
    status: GenerationJobStatus,
    currentStage: string,
    safeErrorCode?: GenerationSafeErrorCode | null,
  ): Promise<GenerationJob | null>;
}
