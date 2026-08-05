import "server-only";

import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type {
  LessonRepository,
  LessonSummary,
  PublishLessonInput,
} from "@/modules/lesson/ports/lesson-repository";
import type { TranscriptRepository } from "@/modules/transcript/ports/transcript-repository";
import {
  LESSON_PIPELINE_VERSION,
  LESSON_SCHEMA_VERSION,
  lessonSchema,
  type Lesson,
} from "@/shared/contracts/lesson";

export class InMemoryLessonRepository implements LessonRepository {
  private readonly byJobId = new Map<string, Lesson>();

  constructor(
    private readonly generationRepository: GenerationJobRepository,
    private readonly transcriptRepository: TranscriptRepository,
  ) {}

  async listPermittedSegments(jobId: string, ownerUserId: string) {
    // The in-memory language repository advances an eligible job without
    // persisting an allowlist, so every canonical segment stands in for the
    // permitted set here. Supabase applies the real allowlist.
    const transcript = await this.transcriptRepository.findCanonicalForJob(
      ownerUserId,
      jobId,
    );
    return (transcript?.segments ?? []).map((segment) => ({
      id: segment.id,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: segment.text,
    }));
  }

  async publish(
    input: PublishLessonInput,
  ): Promise<{ lessonId: string; created: boolean }> {
    const existing = this.byJobId.get(input.jobId);
    if (existing) return { lessonId: existing.id, created: false };

    const job = await this.generationRepository.findOwnedById(
      input.jobId,
      input.ownerUserId,
    );
    if (!job) throw new Error("generation job not found");

    const lesson = lessonSchema.parse({
      id: crypto.randomUUID(),
      jobId: input.jobId,
      videoId: job.videoId,
      videoTitle: job.videoTitle,
      channelName: job.channelName,
      cefrLevel: input.cefrLevel,
      draft: input.draft,
      citations: input.citations,
      provenance: {
        schemaVersion: LESSON_SCHEMA_VERSION,
        pipelineVersion: LESSON_PIPELINE_VERSION,
        promptVersion: input.promptVersion,
        modelId: input.modelId,
        transcriptHash: input.transcriptHash,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        generatedAt: new Date().toISOString(),
      },
      createdAt: new Date().toISOString(),
    });

    this.byJobId.set(input.jobId, lesson);
    await this.generationRepository.updateStatus(
      input.jobId,
      "completed",
      "completed",
      null,
    );
    return { lessonId: lesson.id, created: true };
  }

  async listOwned(ownerUserId: string): Promise<LessonSummary[]> {
    const owned: LessonSummary[] = [];
    for (const lesson of this.byJobId.values()) {
      const job = await this.generationRepository.findOwnedById(
        lesson.jobId,
        ownerUserId,
      );
      if (!job) continue;
      owned.push({
        id: lesson.id,
        jobId: lesson.jobId,
        videoId: lesson.videoId,
        videoTitle: lesson.videoTitle,
        channelName: lesson.channelName,
        cefrLevel: lesson.cefrLevel,
        titleVi: lesson.draft.titleVi,
        vocabularyCount: lesson.draft.vocabulary.length,
        createdAt: lesson.createdAt,
      });
    }
    return owned.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async findOwnedByJobId(
    jobId: string,
    ownerUserId: string,
  ): Promise<Lesson | null> {
    const lesson = this.byJobId.get(jobId);
    if (!lesson) return null;
    const job = await this.generationRepository.findOwnedById(jobId, ownerUserId);
    return job ? lesson : null;
  }
}

declare global {
  var __vidlishLessonRepository: InMemoryLessonRepository | undefined;
}

export function getInMemoryLessonRepository(
  generationRepository: GenerationJobRepository,
  transcriptRepository: TranscriptRepository,
): InMemoryLessonRepository {
  globalThis.__vidlishLessonRepository ??= new InMemoryLessonRepository(
    generationRepository,
    transcriptRepository,
  );
  return globalThis.__vidlishLessonRepository;
}
