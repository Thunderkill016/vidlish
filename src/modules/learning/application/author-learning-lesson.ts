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
import type { LearningAuthoringBriefRepository } from "@/modules/learning/ports/learning-authoring-brief-repository";
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

/**
 * First half: read the video, propose, and let the deterministic gate refuse.
 *
 * Split from authoring because the two model calls together overrun a workflow
 * step and the invocation dies with no error handler ever running. Each half is
 * one model call now, and the brief rests in the database between them.
 */
export class DiagnoseLearningLesson {
  constructor(
    private readonly provider: LearningAuthoringProvider,
    private readonly briefs: LearningAuthoringBriefRepository,
  ) {}

  async execute(input: {
    jobId: string;
    ownerUserId: string;
    videoTitle: string;
    channelName: string;
    transcript: CanonicalTranscript;
    eligibility: LanguageEligibilityReport;
    learnerSnapshot: LearnerContextSnapshot;
    now: Date;
  }): Promise<{ inputTokens: number; outputTokens: number }> {
    const context = assembleLearningGenerationContext({
      jobId: input.jobId,
      videoTitle: input.videoTitle,
      channelName: input.channelName,
      transcript: input.transcript,
      eligibility: input.eligibility,
      learnerSnapshot: input.learnerSnapshot,
    });

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

    await this.briefs.save({
      ownerUserId: input.ownerUserId,
      jobId: input.jobId,
      brief: prepared.authoringBrief,
      videoProfile: prepared.videoProfile,
    });

    return {
      inputTokens: diagnosis.inputTokens,
      outputTokens: diagnosis.outputTokens,
    };
  }
}

export class AuthorLearningLesson {
  constructor(
    private readonly provider: LearningAuthoringProvider,
    private readonly repository: LessonVersionRepository,
    private readonly briefs: LearningAuthoringBriefRepository,
  ) {}

  async execute(
    input: AuthorLearningLessonInput,
  ): Promise<AuthorLearningLessonResult> {
    // The brief was produced and gated in the previous step. Re-running
    // diagnosis here would spend a second model call and could quietly pick
    // different material than the one already recorded.
    const stored = await this.briefs.findForJob({
      ownerUserId: input.ownerUserId,
      jobId: input.jobId,
    });
    if (!stored) {
      throw new Error("Learning authoring brief was not prepared for this job.");
    }

    const permittedIds = new Set(input.eligibility.permittedSegmentIds);
    const permittedSegments = input.transcript.segments.filter((segment) =>
      permittedIds.has(segment.id),
    );

    const authored = await this.provider.author({
      brief: stored.brief,
      permittedSegments,
    });

    // Between the model writing and a learner seeing it. Repairs what can be
    // repaired, refuses what means the lesson does not teach.
    const reviewed = reviewAuthoringDraft(authored.value);

    const blueprint = hydrateLearningBlueprint({
      brief: stored.brief,
      draft: reviewed.draft,
      profile: stored.videoProfile,
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
      inputTokens: authored.inputTokens,
      outputTokens: authored.outputTokens,
    };
  }
}

export { LearningBlueprintHydrationError };
