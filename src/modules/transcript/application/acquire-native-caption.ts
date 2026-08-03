import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { normalizeTranscript } from "@/modules/transcript/application/normalize-transcript";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import type { GenerationJob } from "@/shared/contracts/generation";
import {
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

export type NativeCaptionOutcome =
  | { kind: "persisted"; transcriptId: string; created: boolean }
  | { kind: "already_advanced" }
  | Exclude<TranscriptStrategyResult, { kind: "success" }>;

export class AcquireNativeCaption {
  constructor(
    private readonly generationRepository: GenerationJobRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly strategy: TranscriptStrategy,
    private readonly enabled: boolean,
  ) {}

  async execute(job: GenerationJob): Promise<NativeCaptionOutcome> {
    if (job.status === "checking_language") {
      return { kind: "already_advanced" };
    }

    const startedAt = performance.now();
    const result = this.enabled
      ? await this.strategy.acquire({ videoId: job.videoId })
      : transcriptStrategyResultSchema.parse({
          kind: "terminal_failure",
          reason: "STRATEGY_DISABLED",
        });
    const latencyMs = Math.max(0, performance.now() - startedAt);

    if (result.kind !== "success") {
      await this.transcriptRepository.recordAttempt({
        ownerUserId: job.ownerUserId,
        jobId: job.id,
        strategyId: this.strategy.id,
        provider: "supadata",
        result,
        latencyMs,
      });
      return result;
    }

    if (result.candidate.translationStatus === "translated") {
      const translated = transcriptStrategyResultSchema.parse({
        kind: "not_applicable",
        reason: "TRANSLATED_CAPTION_REJECTED",
      });
      if (translated.kind === "success") {
        throw new Error("Unreachable transcript strategy result.");
      }
      await this.transcriptRepository.recordAttempt({
        ownerUserId: job.ownerUserId,
        jobId: job.id,
        strategyId: this.strategy.id,
        provider: "supadata",
        result: translated,
        latencyMs,
      });
      return translated;
    }

    let transcript;
    try {
      transcript = normalizeTranscript(result.candidate);
    } catch {
      const invalid = transcriptStrategyResultSchema.parse({
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      });
      if (invalid.kind === "success") {
        throw new Error("Unreachable transcript strategy result.");
      }
      await this.transcriptRepository.recordAttempt({
        ownerUserId: job.ownerUserId,
        jobId: job.id,
        strategyId: this.strategy.id,
        provider: "supadata",
        result: invalid,
        latencyMs,
      });
      return invalid;
    }

    await this.generationRepository.updateStatus(
      job.id,
      "normalizing_transcript",
      "normalizing_transcript",
    );
    const persisted = await this.transcriptRepository.persistAndAdvance({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      transcript,
      latencyMs,
    });
    return { kind: "persisted", ...persisted };
  }
}
