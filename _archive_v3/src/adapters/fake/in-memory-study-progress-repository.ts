import "server-only";

import type {
  LessonRepository,
} from "@/modules/lesson/ports/lesson-repository";
import type {
  SaveStudyProgressInput,
  StudyProgressRepository,
} from "@/modules/study/ports/study-progress-repository";
import { summarizeStudyProgress } from "@/modules/study/application/score-study-progress";
import {
  studyProgressSchema,
  type StudyProgress,
  type StudyProgressSummary,
} from "@/shared/contracts/study";

type StoredProgress = StudyProgress & { ownerUserId: string };

export class InMemoryStudyProgressRepository
  implements StudyProgressRepository
{
  private readonly byJobId = new Map<string, StoredProgress>();

  constructor(private readonly lessonRepository: LessonRepository) {}

  async findOwnedByJobId(
    jobId: string,
    ownerUserId: string,
  ): Promise<StudyProgress | null> {
    const stored = this.byJobId.get(jobId);
    if (!stored || stored.ownerUserId !== ownerUserId) return null;
    const { ownerUserId: _owner, ...progress } = stored;
    void _owner;
    return progress;
  }

  async save(input: SaveStudyProgressInput): Promise<StudyProgress> {
    // Same rule as Supabase: the lesson decides who may write progress for it.
    const lesson = await this.lessonRepository.findOwnedByJobId(
      input.jobId,
      input.ownerUserId,
    );
    if (!lesson) throw new Error("lesson not found for study progress");

    const existing = this.byJobId.get(input.jobId);
    const completedAt = input.completed
      ? (existing?.completedAt ?? new Date().toISOString())
      : null;

    const progress = studyProgressSchema.parse({
      jobId: input.jobId,
      lessonId: lesson.id,
      state: input.state,
      completedAt,
      updatedAt: new Date().toISOString(),
    });
    this.byJobId.set(input.jobId, {
      ...progress,
      ownerUserId: input.ownerUserId,
    });
    return progress;
  }

  async listOwnedSummaries(
    ownerUserId: string,
  ): Promise<StudyProgressSummary[]> {
    return [...this.byJobId.values()]
      .filter((stored) => stored.ownerUserId === ownerUserId)
      .map((stored) =>
        summarizeStudyProgress(stored.jobId, stored.state, stored.completedAt),
      );
  }
}

declare global {
  var __vidlishStudyProgressRepository:
    | InMemoryStudyProgressRepository
    | undefined;
}

export function getInMemoryStudyProgressRepository(
  lessonRepository: LessonRepository,
): InMemoryStudyProgressRepository {
  globalThis.__vidlishStudyProgressRepository ??=
    new InMemoryStudyProgressRepository(lessonRepository);
  return globalThis.__vidlishStudyProgressRepository;
}
