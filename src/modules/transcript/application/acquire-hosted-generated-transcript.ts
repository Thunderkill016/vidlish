import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { HostedGeneratedTranscriptPolicy } from "@/modules/transcript/application/hosted-generated-transcript-policy";
import { normalizeTranscript } from "@/modules/transcript/application/normalize-transcript";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import type { PollableTranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import type { GenerationJob } from "@/shared/contracts/generation";
import type {
  CanonicalTranscript,
  TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

type StrategyFailure = Exclude<
  TranscriptStrategyResult,
  { kind: "success" } | { kind: "pending" }
>;

export type HostedGeneratedOutcome =
  | { kind: "persisted"; transcriptId: string; created: boolean }
  | { kind: "already_advanced" }
  | TranscriptStrategyResult;

const downstreamStatuses = new Set<GenerationJob["status"]>([
  "checking_language",
  "analyzing_video",
  "mining_language",
  "planning_lesson",
  "composing_activities",
  "validating_lesson",
  "repairing_lesson",
  "publishing",
  "completed",
  "failed",
  "cancelled",
]);

export class AcquireHostedGeneratedTranscript {
  constructor(
    private readonly generationRepository: GenerationJobRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly strategy: PollableTranscriptStrategy,
    private readonly policy: HostedGeneratedTranscriptPolicy,
  ) {}

  async start(job: GenerationJob): Promise<HostedGeneratedOutcome> {
    if (downstreamStatuses.has(job.status)) {
      return { kind: "already_advanced" };
    }

    const policy = this.policy.evaluate(job);
    if (!policy.allowed) {
      const blocked: StrategyFailure = {
        kind: "not_applicable",
        reason: "GENERATED_TRANSCRIPT_POLICY_BLOCKED",
      };
      await this.record(job, blocked, 0);
      return blocked;
    }

    await this.generationRepository.updateStatus(
      job.id,
      "acquiring_transcript",
      "trying_transcript_fallback",
      null,
    );
    const startedAt = performance.now();
    const result = await this.strategy.acquire({ videoId: job.videoId });
    return this.handle(job, result, performance.now() - startedAt);
  }

  async poll(
    job: GenerationJob,
    providerJobId: string,
  ): Promise<HostedGeneratedOutcome> {
    if (downstreamStatuses.has(job.status)) {
      return { kind: "already_advanced" };
    }
    const startedAt = performance.now();
    const result = await this.strategy.poll({
      providerJobId,
      videoId: job.videoId,
    });
    return this.handle(
      job,
      result,
      performance.now() - startedAt,
      providerJobId,
    );
  }

  async recordTimeout(
    job: GenerationJob,
    providerJobId: string,
  ): Promise<TranscriptStrategyResult> {
    const result: TranscriptStrategyResult = {
      kind: "retryable_failure",
      reason: "PROVIDER_JOB_TIMEOUT",
    };
    await this.record(job, result, 0, providerJobId);
    await this.generationRepository.updateStatus(
      job.id,
      "acquiring_transcript",
      "automatic_transcript_unavailable",
      null,
    );
    return result;
  }

  private async handle(
    job: GenerationJob,
    result: TranscriptStrategyResult,
    latencyMs: number,
    providerJobId?: string,
  ): Promise<HostedGeneratedOutcome> {
    if (result.kind === "pending") {
      await this.record(job, result, latencyMs);
      return result;
    }
    if (result.kind !== "success") {
      await this.record(job, result, latencyMs, providerJobId);
      await this.generationRepository.updateStatus(
        job.id,
        "acquiring_transcript",
        "automatic_transcript_unavailable",
        null,
      );
      return result;
    }

    if (result.candidate.translationStatus === "translated") {
      const rejected: StrategyFailure = {
        kind: "not_applicable",
        reason: "TRANSLATED_CAPTION_REJECTED",
      };
      await this.record(job, rejected, latencyMs, providerJobId);
      return rejected;
    }

    let transcript: CanonicalTranscript;
    try {
      transcript = normalizeTranscript(result.candidate);
    } catch {
      const invalid: StrategyFailure = {
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      };
      await this.record(job, invalid, latencyMs, providerJobId);
      return invalid;
    }

    await this.generationRepository.updateStatus(
      job.id,
      "normalizing_transcript",
      "normalizing_transcript",
      null,
    );
    const persisted = await this.transcriptRepository.persistAndAdvance({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      transcript,
      latencyMs,
      costBand: this.strategy.costBand,
      ...(providerJobId ? { providerJobId } : {}),
    });
    return { kind: "persisted", ...persisted };
  }

  private async record(
    job: GenerationJob,
    result: Exclude<TranscriptStrategyResult, { kind: "success" }>,
    latencyMs: number,
    providerJobId?: string,
  ): Promise<void> {
    const effectiveResult =
      result.kind === "pending" && providerJobId
        ? { ...result, providerJobId }
        : result;
    await this.transcriptRepository.recordAttempt({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      strategyId: this.strategy.id,
      provider: "supadata",
      costBand: this.strategy.costBand,
      result: effectiveResult,
      latencyMs: Math.max(0, latencyMs),
    });
  }
}
