import "server-only";

import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type {
  TranscriptAttemptRecord,
  TranscriptRepository,
} from "@/modules/transcript/ports/transcript-repository";
import type {
  CanonicalTranscript,
  TranscriptPersistResult,
} from "@/shared/contracts/transcript";

export class InMemoryTranscriptRepository implements TranscriptRepository {
  private readonly transcripts = new Map<
    string,
    {
      id: string;
      ownerUserId: string;
      jobId: string;
      transcript: CanonicalTranscript;
    }
  >();
  private readonly attempts = new Map<string, TranscriptAttemptRecord>();
  private readonly providerJobs = new Map<
    string,
    { status: "pending" | "completed" | "failed" | "timed_out" }
  >();

  constructor(private readonly generationRepository: GenerationJobRepository) {}

  async recordAttempt(input: TranscriptAttemptRecord): Promise<void> {
    const reason =
      input.result.kind === "pending"
        ? "PROVIDER_JOB_PENDING"
        : input.result.reason;
    const providerJobId =
      input.providerJobId ??
      (input.result.kind === "pending"
        ? input.result.providerJobId
        : undefined);
    const key = [
      input.jobId,
      input.strategyId,
      input.result.kind,
      providerJobId ?? "direct",
      reason,
    ].join(":");
    this.attempts.set(key, input);

    if (providerJobId) {
      const providerKey = [
        input.ownerUserId,
        input.jobId,
        input.strategyId,
        providerJobId,
      ].join(":");
      const status =
        input.result.kind === "pending"
          ? "pending"
          : input.result.kind === "retryable_failure" &&
              input.result.reason === "PROVIDER_JOB_TIMEOUT"
            ? "timed_out"
            : "failed";
      this.providerJobs.set(providerKey, { status });
    }
  }

  async persistAndAdvance(input: {
    ownerUserId: string;
    jobId: string;
    transcript: CanonicalTranscript;
    latencyMs: number;
    costBand?: "none" | "metered_low" | "metered_medium" | "metered_high";
    providerJobId?: string;
  }): Promise<TranscriptPersistResult> {
    const key = [
      input.jobId,
      input.transcript.normalizedHash,
      input.transcript.normalizationVersion,
    ].join(":");
    const existing = this.transcripts.get(key);
    const id = existing?.id ?? crypto.randomUUID();
    if (!existing) {
      this.transcripts.set(key, {
        id,
        ownerUserId: input.ownerUserId,
        jobId: input.jobId,
        transcript: input.transcript,
      });
    }
    if (input.providerJobId) {
      const providerKey = [
        input.ownerUserId,
        input.jobId,
        input.transcript.strategyId,
        input.providerJobId,
      ].join(":");
      this.providerJobs.set(providerKey, { status: "completed" });
    }
    await this.generationRepository.updateStatus(
      input.jobId,
      "checking_language",
      "checking_language",
      null,
    );
    return { transcriptId: id, created: !existing };
  }

  async findCanonicalForJob(
    ownerUserId: string,
    jobId: string,
  ): Promise<CanonicalTranscript | null> {
    const match = [...this.transcripts.values()].find(
      (entry) =>
        entry.ownerUserId === ownerUserId && entry.jobId === jobId,
    );
    return match?.transcript ?? null;
  }

  getTranscriptCount(): number {
    return this.transcripts.size;
  }

  getAttemptCount(): number {
    return this.attempts.size;
  }

  getProviderJobStatus(input: {
    ownerUserId: string;
    jobId: string;
    strategyId: string;
    providerJobId: string;
  }): string | undefined {
    return this.providerJobs.get(
      [
        input.ownerUserId,
        input.jobId,
        input.strategyId,
        input.providerJobId,
      ].join(":"),
    )?.status;
  }
}

declare global {
  var __vidlishTranscriptRepository: InMemoryTranscriptRepository | undefined;
}

export function getInMemoryTranscriptRepository(
  generationRepository: GenerationJobRepository,
): InMemoryTranscriptRepository {
  globalThis.__vidlishTranscriptRepository ??=
    new InMemoryTranscriptRepository(generationRepository);
  return globalThis.__vidlishTranscriptRepository;
}
