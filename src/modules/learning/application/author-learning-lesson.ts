import {
  hydrateLearningBlueprint,
  LearningBlueprintHydrationError,
} from "./hydrate-learning-blueprint";
import { reviewAuthoringDraft } from "./review-authoring-draft";
import {
  assembleLearningGenerationContext,
  diagnoseLearningVideo,
  prepareLearningAuthoringBrief,
} from "./prepare-learning-authoring-brief";

import type { LearningAuthoringProvider } from "@/modules/learning/ports/learning-authoring-provider";
import type { LessonVersionRepository } from "@/modules/learning/ports/lesson-version-repository";
import type { LanguageEligibilityReport } from "@/shared/contracts/language-eligibility";
import type { LearnerContextSnapshot } from "@/shared/contracts/lesson-v2";
import type { CanonicalTranscript } from "@/shared/contracts/transcript";

/**
 * Produces the v2 lesson a learner actually studies.
 *
 * This is the chain gate 0 was missing. Everything above it — sessions,
 * attempts, delayed review, FSRS scheduling — has been reachable in code and
 * unreachable for a real learner, because nothing created the content it runs
 * on outside a CI fixture.
 *
 * The order matters and is not an implementation detail. The model proposes,
 * a deterministic gate refuses, and only what survives is authored. Letting the
 * authoring call see the whole transcript instead would put the choice of what
 * to teach back inside the model, where none of it can be checked.
 */

export type AuthorLearningLessonInput = {
  readonly jobId: string;
  readonly lessonId: string;
  readonly ownerUserId: string;
  readonly videoTitle: string;
  readonly channelName: string;
  readonly transcript: CanonicalTranscript;
  readonly eligibility: LanguageEligibilityReport;
  readonly learnerSnapshot: LearnerContextSnapshot;
  readonly blueprintId: string;
  readonly now: Date;
};

export type AuthorLearningLessonResult = {
  readonly lessonVersionId: string;
  readonly created: boolean;
  /** What the quality pass had to fix in the model's draft. */
  readonly repairs: readonly string[];
  readonly modelId: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
};

export class AuthorLearningLesson {
  constructor(
    private readonly provider: LearningAuthoringProvider,
    private readonly repository: LessonVersionRepository,
  ) {}

  async execute(
    input: AuthorLearningLessonInput,
  ): Promise<AuthorLearningLessonResult> {
    const context = assembleLearningGenerationContext({
      jobId: input.jobId,
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      transcript: input.transcript,
      eligibility: input.eligibility,
      learnerSnapshot: input.learnerSnapshot,
    });

    // Deterministic: measured from the transcript, no model involved. The model
    // is given these findings rather than asked to produce them, so a model
    // that flatters the video cannot make an impossible one look teachable.
    const profile = diagnoseLearningVideo(context);

    const diagnosis = await this.provider.diagnose({
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      profile,
      permittedSegments: context.permittedSegments,
    });

    const prepared = prepareLearningAuthoringBrief({
      jobId: input.jobId,
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      transcript: input.transcript,
      eligibility: input.eligibility,
      learnerSnapshot: input.learnerSnapshot,
      diagnosisProposal: diagnosis.value,
      now: input.now,
    });

    const authored = await this.provider.author({
      brief: prepared.authoringBrief,
      permittedSegments: context.permittedSegments,
    });

    // Between the model writing and a learner seeing it. Repairs what can be
    // repaired, refuses what means the lesson does not teach.
    const reviewed = reviewAuthoringDraft(authored.value);

    const blueprint = hydrateLearningBlueprint({
      brief: prepared.authoringBrief,
      draft: reviewed.draft,
      profile: prepared.videoProfile,
      learnerSnapshot: input.learnerSnapshot,
      transcript: input.transcript,
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      blueprintId: input.blueprintId,
      modelId: authored.modelId,
      createdAt: input.now.toISOString(),
    });

    const published = await this.repository.publish({
      ownerUserId: input.ownerUserId,
      lessonId: input.lessonId,
      blueprint,
    });

    return {
      lessonVersionId: published.lessonVersionId,
      created: published.created,
      repairs: reviewed.repairs,
      modelId: authored.modelId,
      // Both calls are billed, so both are reported. Counting only the authoring
      // call would understate the cost of a lesson by the larger half.
      inputTokens: diagnosis.inputTokens + authored.inputTokens,
      outputTokens: diagnosis.outputTokens + authored.outputTokens,
    };
  }
}

export { LearningBlueprintHydrationError };
