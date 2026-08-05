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

/** What the library shows. Deliberately not the whole lesson: the draft is
 *  large, and listing it would pull every citation of every lesson into memory
 *  to render a title. */
export type LessonSummary = {
  id: string;
  jobId: string;
  videoId: string;
  videoTitle: string;
  channelName: string;
  cefrLevel: CefrLevel;
  titleVi: string;
  vocabularyCount: number;
  createdAt: string;
};

export interface LessonRepository {
  /** Atomic: writes the lesson and completes the job in one commit. */
  publish(input: PublishLessonInput): Promise<{ lessonId: string; created: boolean }>;
  findOwnedByJobId(jobId: string, ownerUserId: string): Promise<Lesson | null>;
  /** Every lesson this learner owns, newest first. */
  listOwned(ownerUserId: string): Promise<LessonSummary[]>;
  /** The permitted (English-eligible) segments for a job, in play order. */
  listPermittedSegments(
    jobId: string,
    ownerUserId: string,
  ): Promise<Array<{ id: string; startMs: number; endMs: number; text: string }>>;
}
