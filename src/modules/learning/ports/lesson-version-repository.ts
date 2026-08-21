import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

export type PublishLessonVersionInput = {
  ownerUserId: string;
  /**
   * The job this blueprint came from. Ownership is checked against it.
   *
   * The job, not the v1 lesson: a blueprint used to hang off `lessons`, so v2
   * could not exist unless v1 had published first — and production showed a job
   * failing six times inside v1's quality gate, taking v2 down with it. The job
   * owns the transcript and the learner's request; the v1 lesson is a sibling
   * artefact, not a parent.
   */
  jobId: string;
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

  /**
   * The blueprint a durable session is running on.
   *
   * Attempt and support routes need it to grade against the lesson the learner
   * actually opened. Owner-scoped: a session id from someone else's account
   * must resolve to nothing rather than to their content.
   */
  findByIdForOwner(input: {
    ownerUserId: string;
    lessonVersionId: string;
  }): Promise<OwnedLessonVersion | null>;
}
