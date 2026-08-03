import "server-only";

import { getInMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InlineGenerationDispatcher } from "@/adapters/fake/inline-generation-dispatcher";
import { InngestGenerationDispatcher } from "@/adapters/inngest/generation-dispatcher";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseGenerationJobRepository } from "@/adapters/supabase/generation-job-repository";
import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { getServerConfig } from "@/platform/config/server";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";

export function createGenerationRepository(): GenerationJobRepository {
  const config = getServerConfig();
  return config.GENERATION_REPOSITORY === "fake"
    ? getInMemoryGenerationJobRepository()
    : new SupabaseGenerationJobRepository(getAdminSupabaseClient());
}

function createInlineDispatcher(
  repository: GenerationJobRepository,
): InlineGenerationDispatcher {
  const transcriptRuntime = createTranscriptRuntime(repository);
  const acquireNativeCaption = new AcquireNativeCaption(
    repository,
    transcriptRuntime.repository,
    transcriptRuntime.strategy,
    transcriptRuntime.enabled,
  );

  return new InlineGenerationDispatcher(repository, async (job) => {
    const outcome = await acquireNativeCaption.execute(job);
    if (outcome.kind === "retryable_failure") {
      throw new Error(`Native caption retry: ${outcome.reason}`);
    }
  });
}

export function createGenerationRuntime(): {
  repository: GenerationJobRepository;
  dispatcher: GenerationDispatcher;
  policy: GenerationPolicy;
} {
  const config = getServerConfig();
  const repository = createGenerationRepository();
  const dispatcher =
    config.GENERATION_DISPATCHER === "inline"
      ? createInlineDispatcher(repository)
      : new InngestGenerationDispatcher();
  const policy = new GenerationPolicy({
    maxActiveJobs: config.GENERATION_MAX_ACTIVE_JOBS,
    maxJobsPerDay: config.GENERATION_MAX_JOBS_PER_DAY,
    maxJobsPerMinute: config.GENERATION_MAX_JOBS_PER_MINUTE,
  });
  return { repository, dispatcher, policy };
}
