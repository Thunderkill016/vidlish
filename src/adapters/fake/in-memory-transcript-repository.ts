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
    { id: string; transcript: CanonicalTranscript }
  >();
  private readonly attempts = new Map<string, TranscriptAttemptRecord>();

  constructor(private readonly generationRepository: GenerationJobRepository) {}

  async recordAttempt(input: TranscriptAttemptRecord): Promise<void> {
    const key = [
      input.jobId,
      input.strategyId,
      input.result.kind,
      input.result.reason,
    ].join(":");
    this.attempts.set(key, input);
  }

  async persistAndAdvance(input: {
    ownerUserId: string;
    jobId: string;
    transcript: CanonicalTranscript;
    latencyMs: number;
  }): Promise<TranscriptPersistResult> {
    const key = [
      input.jobId,
      input.transcript.normalizedHash,
      input.transcript.normalizationVersion,
    ].join(":");
    const existing = this.transcripts.get(key);
    const id = existing?.id ?? crypto.randomUUID();
    if (!existing) {
      this.transcripts.set(key, { id, transcript: input.transcript });
    }
    await this.generationRepository.updateStatus(
      input.jobId,
      "checking_language",
      "checking_language",
    );
    return { transcriptId: id, created: !existing };
  }

  getTranscriptCount(): number {
    return this.transcripts.size;
  }

  getAttemptCount(): number {
    return this.attempts.size;
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
