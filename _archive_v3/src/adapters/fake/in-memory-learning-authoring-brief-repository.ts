import type {
  LearningAuthoringBriefRepository,
  StoredAuthoringBrief,
} from "@/modules/learning/ports/learning-authoring-brief-repository";

/** One entry per job, matching the database's primary key. */
export class InMemoryLearningAuthoringBriefRepository
  implements LearningAuthoringBriefRepository
{
  private readonly stored = new Map<
    string,
    StoredAuthoringBrief & { ownerUserId: string }
  >();

  async save(input: {
    ownerUserId: string;
    jobId: string;
    brief: StoredAuthoringBrief["brief"];
    videoProfile: StoredAuthoringBrief["videoProfile"];
  }): Promise<void> {
    this.stored.set(input.jobId, {
      ownerUserId: input.ownerUserId,
      brief: input.brief,
      videoProfile: input.videoProfile,
    });
  }

  async findForJob(input: { ownerUserId: string; jobId: string }) {
    const entry = this.stored.get(input.jobId);
    if (!entry || entry.ownerUserId !== input.ownerUserId) return null;
    return { brief: entry.brief, videoProfile: entry.videoProfile };
  }
}
