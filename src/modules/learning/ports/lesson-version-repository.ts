import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

export type PublishLessonVersionInput = {
  ownerUserId: string;
  /** The v1 lesson this blueprint belongs to. Ownership is checked against it. */
  lessonId: string;
  blueprint: LessonBlueprintV2;
};

export type PublishedLessonVersion = {
  lessonVersionId: string;
  /**
   * False when this lesson already had a published version. Publishing is
   * once-only: a blueprint a learner has already started a session on must not
   * change under them.
   */
  created: boolean;
};

/**
 * Creates the v2 content a learning session runs on.
 *
 * Until this existed, `lesson_versions` rows came only from a CI fixture, so
 * the entire v2 stack was unreachable for a real learner.
 */
export type OwnedLessonVersion = {
  lessonVersionId: string;
  blueprint: LessonBlueprintV2;
};

export interface LessonVersionRepository {
  publish(input: PublishLessonVersionInput): Promise<PublishedLessonVersion>;

  /**
   * The published v2 lesson for a job, if there is one.
   *
   * Owner-scoped, and the blueprint is parsed on the way out: a row that no
   * longer satisfies the contract must fail here rather than render a broken
   * session for the learner.
   */
  findForJob(input: {
    ownerUserId: string;
    jobId: string;
  }): Promise<OwnedLessonVersion | null>;
}
