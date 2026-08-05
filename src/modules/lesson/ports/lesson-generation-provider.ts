import type { CefrLevel } from "@/shared/contracts/lesson-draft";
import type { LessonDraft } from "@/shared/contracts/lesson";

export type LessonGenerationInput = {
  cefrLevel: CefrLevel;
  videoTitle: string;
  channelName: string;
  /**
   * Only segments the original-English gate permitted. Nothing else may reach
   * the model — a non-English segment cannot become source evidence.
   */
  permittedSegments: ReadonlyArray<{
    id: string;
    startMs: number;
    endMs: number;
    text: string;
  }>;
};

export type LessonGenerationResult = {
  draft: LessonDraft;
  modelId: string;
  promptVersion: string;
  inputTokens: number;
  outputTokens: number;
};

export interface LessonGenerationProvider {
  generate(input: LessonGenerationInput): Promise<LessonGenerationResult>;
}

export class LessonGenerationFailure extends Error {
  readonly name = "LessonGenerationFailure";
  /**
   * `cause` carries the provider's own error. Without it a transport failure
   * and a rejected request shape look identical in the logs, which makes the
   * first live run of a new provider almost impossible to debug.
   */
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
