import "server-only";

import { inngest } from "@/adapters/inngest/client";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { getServerConfig } from "@/platform/config/server";

/**
 * How long a job may sit in a non-terminal state without its row changing
 * before the watchdog gives up on it.
 *
 * Derived from the longest legitimate quiet period in the pipeline today. The
 * durable workflow's only unattended wait is Inngest retrying native caption
 * acquisition, bounded by `retries: 5` over an 8s provider timeout, so a healthy
 * job updates well inside a minute. 15 minutes leaves more than an order of
 * magnitude of headroom while still freeing the learner's quota slot in a single
 * sitting. Revisit when Epic 3 adds Lesson Engine stages, which are slower.
 */
const STALE_JOB_THRESHOLD_MINUTES = 15;

/** Half the threshold, so a stalled job is caught within one threshold window. */
const WATCHDOG_CRON = "*/7 * * * *";

export const expireStalledJobsWorkflow = inngest.createFunction(
  {
    id: "expire-stalled-transcript-jobs",
    name: "Expire stalled transcript jobs",
    triggers: { cron: WATCHDOG_CRON },
    concurrency: { limit: 1 },
    retries: 2,
  },
  async ({ step }) => {
    // Local and CI run the in-memory repository, which has no rows to scan and
    // no Supabase to reach.
    if (getServerConfig().GENERATION_REPOSITORY === "fake") {
      return { expired: 0, skipped: "fake-repository" };
    }

    const expired = await step.run("expire-stalled-jobs", async () => {
      const result = await getAdminSupabaseClient().rpc(
        "expire_stalled_transcript_jobs",
        { p_stale_after: `${STALE_JOB_THRESHOLD_MINUTES} minutes` },
      );
      if (result.error) throw result.error;
      return Array.isArray(result.data) ? result.data.length : 0;
    });

    // Count only. Job IDs are owner-scoped data and this runs unattended.
    return { expired };
  },
);
