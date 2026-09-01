import { describe, expect, it } from "vitest";

import { InMemoryStudyProgressRepository } from "@/adapters/fake/in-memory-study-progress-repository";
import type { LessonRepository } from "@/modules/lesson/ports/lesson-repository";
import {
  STUDY_PROGRESS_VERSION,
  type StudyProgressState,
} from "@/shared/contracts/study";

const OWNER = "11111111-1111-4111-8111-111111111111";
const STRANGER = "22222222-2222-4222-8222-222222222222";
const JOB = "33333333-3333-4333-8333-333333333333";
const LESSON = "44444444-4444-4444-8444-444444444444";

const state: StudyProgressState = {
  version: STUDY_PROGRESS_VERSION,
  comprehensionAnswers: [{ index: 0, selectedIndex: 1 }],
  clozeAttempts: [],
  masteredVocabulary: [2],
};

function lessonRepository(): LessonRepository {
  return {
    async findOwnedByJobId(jobId, ownerUserId) {
      if (jobId !== JOB || ownerUserId !== OWNER) return null;
      return { id: LESSON } as Awaited<
        ReturnType<LessonRepository["findOwnedByJobId"]>
      >;
    },
    publish: async () => ({ lessonId: LESSON, created: true }),
    listOwned: async () => [],
    listPermittedSegments: async () => [],
  };
}

describe("in-memory study progress repository", () => {
  it("saves and reads back a learner's own progress", async () => {
    const repository = new InMemoryStudyProgressRepository(lessonRepository());

    const saved = await repository.save({
      ownerUserId: OWNER,
      jobId: JOB,
      state,
      completed: false,
    });
    expect(saved.lessonId).toBe(LESSON);
    expect(saved.completedAt).toBeNull();

    await expect(repository.findOwnedByJobId(JOB, OWNER)).resolves.toMatchObject(
      { state },
    );
  });

  it("keeps the moment a lesson was first finished across later saves", async () => {
    const repository = new InMemoryStudyProgressRepository(lessonRepository());

    const first = await repository.save({
      ownerUserId: OWNER,
      jobId: JOB,
      state,
      completed: true,
    });
    const second = await repository.save({
      ownerUserId: OWNER,
      jobId: JOB,
      state,
      completed: true,
    });
    expect(second.completedAt).toBe(first.completedAt);

    const reopened = await repository.save({
      ownerUserId: OWNER,
      jobId: JOB,
      state,
      completed: false,
    });
    expect(reopened.completedAt).toBeNull();
  });

  it("refuses to write or read progress for a lesson the learner does not own", async () => {
    const repository = new InMemoryStudyProgressRepository(lessonRepository());
    await repository.save({
      ownerUserId: OWNER,
      jobId: JOB,
      state,
      completed: false,
    });

    await expect(
      repository.save({
        ownerUserId: STRANGER,
        jobId: JOB,
        state,
        completed: false,
      }),
    ).rejects.toThrow();
    await expect(
      repository.findOwnedByJobId(JOB, STRANGER),
    ).resolves.toBeNull();
    await expect(repository.listOwnedSummaries(STRANGER)).resolves.toEqual([]);
    await expect(repository.listOwnedSummaries(OWNER)).resolves.toEqual([
      {
        jobId: JOB,
        answeredActivities: 1,
        masteredVocabularyCount: 1,
        completedAt: null,
      },
    ]);
  });
});
