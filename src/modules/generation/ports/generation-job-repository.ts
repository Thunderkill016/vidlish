import type { PlayableVideoMetadata } from "@/shared/contracts/video";
import type {
  GenerationJob,
  GenerationJobStatus,
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
  getPolicySnapshot(ownerUserId: string): Promise<GenerationPolicySnapshot>;
  createOrReuse(
    input: CreateGenerationJobRecord,
  ): Promise<{ job: GenerationJob; created: boolean }>;
  findOwnedById(jobId: string, ownerUserId: string): Promise<GenerationJob | null>;
  advanceStory21(jobId: string): Promise<GenerationJob | null>;
  markDispatch(
    jobId: string,
    status: "sent" | "failed",
  ): Promise<void>;
  updateStatus(
    jobId: string,
    status: GenerationJobStatus,
    currentStage: string,
  ): Promise<GenerationJob | null>;
}
