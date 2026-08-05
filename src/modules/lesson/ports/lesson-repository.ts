import type { Lesson, LessonCitation, LessonDraft } from "@/shared/contracts/lesson";
import type { CefrLevel } from "@/shared/contracts/lesson-draft";

export type PublishLessonInput = {
  ownerUserId: string;
  jobId: string;
  cefrLevel: CefrLevel;
  transcriptHash: string;
  promptVersion: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  draft: LessonDraft;
  citations: LessonCitation[];
};

export interface LessonRepository {
  /** Atomic: writes the lesson and completes the job in one commit. */
  publish(input: PublishLessonInput): Promise<{ lessonId: string; created: boolean }>;
  findOwnedByJobId(jobId: string, ownerUserId: string): Promise<Lesson | null>;
  /** The permitted (English-eligible) segments for a job, in play order. */
  listPermittedSegments(
    jobId: string,
    ownerUserId: string,
  ): Promise<Array<{ id: string; startMs: number; endMs: number; text: string }>>;
}
