import type {
  StudyProgress,
  StudyProgressState,
  StudyProgressSummary,
} from "@/shared/contracts/study";

export type SaveStudyProgressInput = {
  ownerUserId: string;
  jobId: string;
  state: StudyProgressState;
  completed: boolean;
};

export interface StudyProgressRepository {
  /** The learner's progress on one lesson, or null before they start. */
  findOwnedByJobId(
    jobId: string,
    ownerUserId: string,
  ): Promise<StudyProgress | null>;
  /**
   * Writes the learner's progress for a lesson they own. Ownership is resolved
   * from the lesson itself, so a job the learner does not own cannot be
   * written to even if its ID is guessed.
   */
  save(input: SaveStudyProgressInput): Promise<StudyProgress>;
  /** Headline progress for every lesson on the learner's shelf. */
  listOwnedSummaries(ownerUserId: string): Promise<StudyProgressSummary[]>;
}
