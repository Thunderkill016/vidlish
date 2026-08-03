import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { normalizeTranscript } from "@/modules/transcript/application/normalize-transcript";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import type { TranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import type { GenerationJob } from "@/shared/contracts/generation";
import type {
  CanonicalTranscript,
  TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

type TranscriptFailureResult = Exclude<
  TranscriptStrategyResult,
  { kind: "success" }
>;

export type NativeCaptionOutcome =
  | { kind: "persisted"; transcriptId: string; created: boolean }
  | { kind: "already_advanced" }
  | TranscriptFailureResult;

function translatedCaptionRejected(): TranscriptFailureResult {
  return {
    kind: "not_applicable",
    reason: "TRANSLATED_CAPTION_REJECTED",
  };
}

function invalidProviderResponse(): TranscriptFailureResult {
  return {
    kind: "terminal_failure",
    reason: "PROVIDER_RESPONSE_INVALID",
  };
}

function disabledStrategy(): TranscriptFailureResult {
  return { kind: "terminal_failure", reason: "STRATEGY_DISABLED" };
}

export class AcquireNativeCaption {
  constructor(
    private readonly generationRepository: GenerationJobRepository,
    private readonly transcriptRepository: TranscriptRepository,
    private readonly strategy: TranscriptStrategy,
    private readonly enabled: boolean,
  ) {}

  private async recordFailure(
    job: GenerationJob,
    result: TranscriptFailureResult,
    latencyMs: number,
  ): Promise<void> {
    await this.transcriptRepository.recordAttempt({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      strategyId: this.strategy.id,
      provider: "supadata",
      result,
      latencyMs,
    });
  }

  async execute(job: GenerationJob): Promise<NativeCaptionOutcome> {
    if (job.status === "checking_language") {
      return { kind: "already_advanced" };
    }

    const startedAt = performance.now();
    const result = this.enabled
      ? await this.strategy.acquire({ videoId: job.videoId })
      : disabledStrategy();
    const latencyMs = Math.max(0, performance.now() - startedAt);

    if (result.kind !== "success") {
      await this.recordFailure(job, result, latencyMs);
      return result;
    }

    if (result.candidate.translationStatus === "translated") {
      const translated = translatedCaptionRejected();
      await this.recordFailure(job, translated, latencyMs);
      return translated;
    }

    let transcript: CanonicalTranscript;
    try {
      transcript = normalizeTranscript(result.candidate);
    } catch {
      const invalid = invalidProviderResponse();
      await this.recordFailure(job, invalid, latencyMs);
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
