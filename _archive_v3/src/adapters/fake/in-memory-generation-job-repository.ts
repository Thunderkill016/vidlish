import "server-only";

import type {
  ActiveGenerationJobKey,
  CreateGenerationJobRecord,
  GenerationJobRepository,
  GenerationPolicySnapshot,
  LearningAuthoringOutcome,
} from "@/modules/generation/ports/generation-job-repository";
import {
  activeGenerationJobStatuses,
  generationJobSchema,
  type GenerationJob,
  type GenerationJobStatus,
  type GenerationSafeErrorCode,
} from "@/shared/contracts/generation";

function nowIso(): string {
  return new Date().toISOString();
}

function activeKey(input: ActiveGenerationJobKey): string {
  return [
    input.ownerUserId,
    input.videoId,
    input.cefrLevel,
    input.pipelineVersion,
  ].join(":");
}

export class InMemoryGenerationJobRepository
  implements GenerationJobRepository
{
  private readonly jobs = new Map<string, GenerationJob>();
  private readonly learningAuthoringOutcomes = new Map<
    string,
    LearningAuthoringOutcome
  >();
  private readonly learningAuthoringDetails = new Map<string, string>();
  private readonly activeKeys = new Map<string, string>();
  private createQueue: Promise<void> = Promise.resolve();

  private findActiveNow(input: ActiveGenerationJobKey): GenerationJob | null {
    const key = activeKey(input);
    const existingId = this.activeKeys.get(key);
    if (!existingId) return null;
    const existing = this.jobs.get(existingId);
    if (existing && activeGenerationJobStatuses.includes(existing.status)) {
      return existing;
    }
    this.activeKeys.delete(key);
    return null;
  }

  async findActive(input: ActiveGenerationJobKey): Promise<GenerationJob | null> {
    return this.findActiveNow(input);
  }

  async getPolicySnapshot(ownerUserId: string): Promise<GenerationPolicySnapshot> {
    const now = Date.now();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const owned = [...this.jobs.values()].filter(
      (job) => job.ownerUserId === ownerUserId,
    );
    return {
      activeJobCount: owned.filter((job) =>
        activeGenerationJobStatuses.includes(job.status),
      ).length,
      jobsCreatedToday: owned.filter(
        (job) => Date.parse(job.createdAt) >= dayStart.getTime(),
      ).length,
      jobsCreatedLastMinute: owned.filter(
        (job) => now - Date.parse(job.createdAt) < 60_000,
      ).length,
    };
  }

  async createOrReuse(
    input: CreateGenerationJobRecord,
  ): Promise<{ job: GenerationJob; created: boolean }> {
    const previous = this.createQueue;
    let release!: () => void;
    this.createQueue = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      const keyInput: ActiveGenerationJobKey = {
        ownerUserId: input.ownerUserId,
        videoId: input.metadata.videoId,
        cefrLevel: input.cefrLevel,
        pipelineVersion: input.pipelineVersion,
      };
      const existing = this.findActiveNow(keyInput);
      if (existing) return { job: existing, created: false };

      const timestamp = nowIso();
      const job = generationJobSchema.parse({
        id: crypto.randomUUID(),
        ownerUserId: input.ownerUserId,
        videoId: input.metadata.videoId,
        videoTitle: input.metadata.title,
        channelName: input.metadata.channelName,
        ...(input.metadata.thumbnailUrl
          ? { thumbnailUrl: input.metadata.thumbnailUrl }
          : {}),
        ...(input.metadata.durationMs !== undefined
          ? { durationMs: input.metadata.durationMs }
          : {}),
        cefrLevel: input.cefrLevel,
        metadataVersion: input.metadata.metadataVersion,
        pipelineVersion: input.pipelineVersion,
        status: "queued",
        currentStage: "queued",
        dispatchStatus: "pending",
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      this.jobs.set(job.id, job);
      this.activeKeys.set(activeKey(keyInput), job.id);
      return { job, created: true };
    } finally {
      release();
    }
  }

  async listActiveOwned(ownerUserId: string): Promise<GenerationJob[]> {
    return [...this.jobs.values()]
      .filter(
        (job) =>
          job.ownerUserId === ownerUserId &&
          (activeGenerationJobStatuses as readonly string[]).includes(job.status),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOwnedById(
    jobId: string,
    ownerUserId: string,
  ): Promise<GenerationJob | null> {
    const job = this.jobs.get(jobId);
    return job?.ownerUserId === ownerUserId ? job : null;
  }

  async markTranscriptExhausted(
    jobId: string,
    ownerUserId: string,
    reason: string,
  ): Promise<GenerationJob | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.ownerUserId !== ownerUserId) {
      throw new Error("generation job not found");
    }
    // Mirrors mark_transcript_exhausted: already-terminal jobs keep their outcome.
    if (
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      return job;
    }

    const weakEvidence = reason === "TRANSCRIPT_EVIDENCE_TOO_WEAK";
    return this.updateStatus(
      jobId,
      "failed",
      weakEvidence
        ? "transcript_evidence_too_weak"
        : "transcript_unavailable",
      weakEvidence
        ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
        : "TRANSCRIPT_UNAVAILABLE",
    );
  }

  async beginTranscriptAcquisition(
    jobId: string,
  ): Promise<GenerationJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    if (job.status !== "queued" && job.status !== "validating_video") {
      return job;
    }
    await this.updateStatus(jobId, "validating_video", "validating_video");
    return this.updateStatus(
      jobId,
      "acquiring_transcript",
      "acquiring_transcript",
      null,
    );
  }

  async markDispatch(
    jobId: string,
    status: "sent" | "failed",
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;
    this.jobs.set(jobId, {
      ...job,
      dispatchStatus: status,
      updatedAt: nowIso(),
    });
  }

  async recordLearningAuthoringOutcome(input: {
    ownerUserId: string;
    jobId: string;
    outcome: LearningAuthoringOutcome;
    detail?: string;
  }) {
    const job = this.jobs.get(input.jobId);
    if (!job || job.ownerUserId !== input.ownerUserId) return;
    this.learningAuthoringOutcomes.set(input.jobId, input.outcome);
    if (input.detail) this.learningAuthoringDetails.set(input.jobId, input.detail);
  }

  /** Exposed for tests: the branch the authoring path reported for a job. */
  learningAuthoringOutcomeFor(jobId: string) {
    return this.learningAuthoringOutcomes.get(jobId) ?? null;
  }

  learningAuthoringDetailFor(jobId: string) {
    return this.learningAuthoringDetails.get(jobId) ?? null;
  }

  async updateStatus(
    jobId: string,
    status: GenerationJobStatus,
    currentStage: string,
    safeErrorCode?: GenerationSafeErrorCode | null,
  ): Promise<GenerationJob | null> {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    const next: Record<string, unknown> = {
      ...job,
      status,
      currentStage,
      updatedAt: nowIso(),
    };
    if (safeErrorCode === null) delete next.safeErrorCode;
    else if (safeErrorCode !== undefined) next.safeErrorCode = safeErrorCode;

    const updated = generationJobSchema.parse(next);
    this.jobs.set(jobId, updated);
    return updated;
  }
}

declare global {
  var __vidlishGenerationRepository:
    | InMemoryGenerationJobRepository
    | undefined;
}

export function getInMemoryGenerationJobRepository(): InMemoryGenerationJobRepository {
  globalThis.__vidlishGenerationRepository ??=
    new InMemoryGenerationJobRepository();
  return globalThis.__vidlishGenerationRepository;
}
