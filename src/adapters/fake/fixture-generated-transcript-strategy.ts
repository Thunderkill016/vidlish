import "server-only";

import type { PollableTranscriptStrategy } from "@/modules/transcript/ports/transcript-strategy";
import {
  GENERATED_TRANSCRIPT_STRATEGY_ID,
  transcriptStrategyResultSchema,
  type TranscriptStrategyResult,
} from "@/shared/contracts/transcript";

const generatedEnglish = [
  "Listening to complete source speech gives learners enough context to understand how ideas connect and why a speaker chooses a particular expression.",
  "A strong practice routine begins with the main message, then returns to difficult moments where details, transitions, or implied meaning were missed.",
  "Instead of memorizing isolated words, learners can collect useful phrases, notice their grammar, and compare several examples from the same speaker.",
  "Repeating short sections aloud helps develop rhythm and stress while keeping the focus on clarity rather than copying a particular accent.",
  "After the listening stage, learners should recall the message without the transcript and explain the important points in their own words.",
  "The final task is to transfer one phrase into a new situation, because flexible use is stronger evidence of learning than simple recognition.",
];

function chunks(texts: string[]) {
  return texts.map((text, index) => ({
    text,
    offsetMs: index * 22_000,
    durationMs: 21_500,
    language: "en",
  }));
}

export class FixtureGeneratedTranscriptStrategy
  implements PollableTranscriptStrategy
{
  readonly id = GENERATED_TRANSCRIPT_STRATEGY_ID;
  readonly costBand = "metered_medium" as const;
  private readonly polls = new Map<string, number>();

  async acquire(input: { videoId: string }): Promise<TranscriptStrategyResult> {
    if (input.videoId === "genrate0000") {
      return {
        kind: "retryable_failure",
        reason: "PROVIDER_RATE_LIMITED",
      };
    }
    if (input.videoId === "gennospeech") {
      return { kind: "not_applicable", reason: "NO_SPEECH_DETECTED" };
    }
    if (input.videoId === "geninvalid0") {
      return {
        kind: "terminal_failure",
        reason: "PROVIDER_RESPONSE_INVALID",
      };
    }
    if (input.videoId === "geninstant0") {
      return this.success(input.videoId, "fixture-request-instant");
    }

    const providerJobId = `fixture_${input.videoId}`;
    this.polls.set(providerJobId, 0);
    return transcriptStrategyResultSchema.parse({
      kind: "pending",
      providerJobId,
      providerRequestId: `fixture-request-${input.videoId}`,
    });
  }

  async poll(input: {
    providerJobId: string;
    videoId: string;
  }): Promise<TranscriptStrategyResult> {
    if (input.videoId === "genjobfail0") {
      return { kind: "retryable_failure", reason: "PROVIDER_JOB_FAILED" };
    }
    const count = (this.polls.get(input.providerJobId) ?? 0) + 1;
    this.polls.set(input.providerJobId, count);
    if (count < 2) {
      return transcriptStrategyResultSchema.parse({
        kind: "pending",
        providerJobId: input.providerJobId,
        providerRequestId: `fixture-poll-${count}`,
      });
    }
    return this.success(input.videoId, `fixture-complete-${input.videoId}`);
  }

  private success(
    videoId: string,
    providerRequestId: string,
  ): TranscriptStrategyResult {
    return transcriptStrategyResultSchema.parse({
      kind: "success",
      candidate: {
        strategyId: GENERATED_TRANSCRIPT_STRATEGY_ID,
        provider: "supadata",
        sourceType: "hosted_generated_transcript",
        videoId,
        providerRequestId,
        declaredLanguage: "en",
        availableLanguages: ["en"],
        trackKind: "unknown",
        translationStatus: "original",
        chunks: chunks(generatedEnglish),
      },
    });
  }
}
