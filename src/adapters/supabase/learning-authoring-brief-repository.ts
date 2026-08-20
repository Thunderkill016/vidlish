import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LearningAuthoringBriefRepository,
  StoredAuthoringBrief,
} from "@/modules/learning/ports/learning-authoring-brief-repository";
import {
  learningAuthoringBriefSchema,
  videoLearningProfileV2Schema,
} from "@/shared/contracts/learning-generation-v2";

export class SupabaseLearningAuthoringBriefRepository
  implements LearningAuthoringBriefRepository
{
  constructor(private readonly client: SupabaseClient) {}

  async save(input: {
    ownerUserId: string;
    jobId: string;
    brief: unknown;
    videoProfile: unknown;
  }): Promise<void> {
    const rpc = await this.client.rpc("save_learning_authoring_brief", {
      p_owner_user_id: input.ownerUserId,
      p_job_id: input.jobId,
      p_brief: input.brief,
      p_video_profile: input.videoProfile,
    });
    if (rpc.error) throw rpc.error;
  }

  async findForJob(input: {
    ownerUserId: string;
    jobId: string;
  }): Promise<StoredAuthoringBrief | null> {
    const result = await this.client
      .from("learning_authoring_briefs")
      .select("brief,video_profile")
      .eq("owner_user_id", input.ownerUserId)
      .eq("job_id", input.jobId)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;

    const row = result.data as { brief: unknown; video_profile: unknown };
    // Parsed on the way out. A row that no longer satisfies the contract has to
    // fail here, not halfway through authoring a lesson from it.
    return {
      brief: learningAuthoringBriefSchema.parse(row.brief),
      videoProfile: videoLearningProfileV2Schema.parse(row.video_profile),
    };
  }
}
