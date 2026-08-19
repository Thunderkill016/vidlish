import { hydrateLessonCitations } from "@/modules/lesson/application/hydrate-lesson-citations";
import { validateGeneratedLessonQuality } from "@/modules/lesson/application/validate-generated-lesson-quality";
import {
  LessonGenerationFailure,
  type LessonGenerationProvider,
} from "@/modules/lesson/ports/lesson-generation-provider";
import type { LessonRepository } from "@/modules/lesson/ports/lesson-repository";
import type { GenerationJob } from "@/shared/contracts/generation";

export type GenerateLessonOutcome =
  | { kind: "published"; lessonId: string; created: boolean }
  | { kind: "already_published"; lessonId: string }
  | { kind: "no_permitted_segments" };

export class GenerateLesson {
  constructor(
    private readonly repository: LessonRepository,
    private readonly provider: LessonGenerationProvider,
  ) {}

  async execute(
    job: GenerationJob,
    transcriptHash: string,
  ): Promise<GenerateLessonOutcome> {
    const existing = await this.repository.findOwnedByJobId(
      job.id,
      job.ownerUserId,
    );
    if (existing) {
      return { kind: "already_published", lessonId: existing.id };
    }

    // Only what the original-English gate permitted. If the gate let a job
    // through with nothing usable, stop before paying for a model call.
    const permitted = await this.repository.listPermittedSegments(
      job.id,
      job.ownerUserId,
    );
    if (permitted.length === 0) {
      return { kind: "no_permitted_segments" };
    }

    const result = await this.provider.generate({
      cefrLevel: job.cefrLevel,
      videoTitle: job.videoTitle,
      channelName: job.channelName,
      permittedSegments: permitted,
    });

    // Cross-field quality gate for things a JSON schema cannot prove: a term
    // must actually occur in the segment it cites, options must be distinct,
    // cloze shape must be valid, and generated examples must not simply copy a
    // canonical source line. Never auto-repair model output here.
    const qualityIssues = validateGeneratedLessonQuality(result.draft, permitted);
    if (qualityIssues.length > 0) {
      const detail = qualityIssues
        .slice(0, 8)
        .map((issue) => `${issue.code}@${issue.path}`)
        .join(", ");
      throw new LessonGenerationFailure(
        `Lesson output failed deterministic quality validation — ${detail}`,
        true,
      );
    }

    // Grounding gate. Throws if the draft cited anything outside `permitted`.
    const citations = hydrateLessonCitations(result.draft, permitted);

    const published = await this.repository.publish({
      ownerUserId: job.ownerUserId,
      jobId: job.id,
      cefrLevel: job.cefrLevel,
      transcriptHash,
      promptVersion: result.promptVersion,
      modelId: result.modelId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      draft: result.draft,
      citations,
    });

    return { kind: "published", ...published };
  }
}
