import { hydrateLessonCitations } from "@/modules/lesson/application/hydrate-lesson-citations";
import type { LessonGenerationProvider } from "@/modules/lesson/ports/lesson-generation-provider";
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
