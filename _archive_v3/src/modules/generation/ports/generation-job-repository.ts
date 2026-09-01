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
  /**
   * YouTube's `defaultAudioLanguage`, when the video declares one.
   *
   * The caption strategy uses it to tell an original English track from an
   * English translation. A TED talk in English was refused because the native
   * endpoint returned a translated track; forcing `en` blindly would instead
   * fetch translations of non-English videos, which breaks the invariant that
   * source quotes are exact spoken English.
   */
  declaredAudioLanguage?: string;
  cefrLevel: CefrLevel;
  pipelineVersion: GenerationJob["pipelineVersion"];
};

export type CreateGenerationJobRecord = {
  ownerUserId: string;
  cefrLevel: CefrLevel;
  metadata: PlayableVideoMetadata;
  pipelineVersion: GenerationJob["pipelineVersion"];
};

export type LearningAuthoringOutcome =
  | "disabled"
  | "job_missing"
  | "transcript_missing"
  | "not_eligible"
  | "lesson_missing"
  | "diagnosed"
  | "authored"
  | "diagnose_failed"
  | "authoring_failed";

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
  /**
   * Records which branch the v2 authoring path took for this job.
   *
   * Diagnostic only. The authoring steps swallow their own failures so a lost
   * v2 lesson cannot fail a learner's finished job, which also means nothing on
   * the record distinguished "provider off" from "model call failed" — both
   * leave the same absence. This makes the branch queryable.
   */
  recordLearningAuthoringOutcome(input: {
    ownerUserId: string;
    jobId: string;
    outcome: LearningAuthoringOutcome;
    /** Classification only — never a provider or model message. */
    detail?: string;
  }): Promise<void>;

  updateStatus(
    jobId: string,
    status: GenerationJobStatus,
    currentStage: string,
    safeErrorCode?: GenerationSafeErrorCode | null,
  ): Promise<GenerationJob | null>;
}
