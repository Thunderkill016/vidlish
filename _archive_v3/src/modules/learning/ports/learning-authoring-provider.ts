import type {
  ConstrainedDiagnosisProposal,
  LearningAuthoringBrief,
  VideoLearningProfileV2,
} from "@/shared/contracts/learning-generation-v2";
import type { LearningAuthoringDraftV2 } from "@/shared/contracts/learning-authoring-draft-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * The two model calls that produce a v2 lesson.
 *
 * They are separate on purpose. Diagnosis reads the whole permitted transcript
 * and proposes what could be taught; a deterministic gate then throws most of
 * it away before authoring is asked to write anything. Merging the two would
 * hand the model a blank page and the deterministic gate nothing to filter.
 *
 * Neither call may return a quote or a timestamp. They return IDs and labels;
 * the server hydrates the rest from the canonical transcript.
 */

export type DiagnoseLearningVideoInput = {
  readonly videoTitle: string;
  readonly channelName: string;
  readonly profile: VideoLearningProfileV2;
  /** Only segments the original-English gate permitted. */
  readonly permittedSegments: CanonicalTranscript["segments"];
};

export type AuthorLearningDraftInput = {
  readonly brief: LearningAuthoringBrief;
  readonly permittedSegments: CanonicalTranscript["segments"];
};

export type LearningAuthoringResult<T> = {
  readonly value: T;
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export interface LearningAuthoringProvider {
  diagnose(
    input: DiagnoseLearningVideoInput,
  ): Promise<LearningAuthoringResult<ConstrainedDiagnosisProposal>>;

  author(
    input: AuthorLearningDraftInput,
  ): Promise<LearningAuthoringResult<LearningAuthoringDraftV2>>;
}

export class LearningAuthoringFailure extends Error {
  readonly name = "LearningAuthoringFailure";
  constructor(
    message: string,
    readonly retryable: boolean,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
