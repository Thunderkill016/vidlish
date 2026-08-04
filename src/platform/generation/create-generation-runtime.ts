import "server-only";

import { getInMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InlineGenerationDispatcher } from "@/adapters/fake/inline-generation-dispatcher";
import { InngestGenerationDispatcher } from "@/adapters/inngest/generation-dispatcher";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseGenerationJobRepository } from "@/adapters/supabase/generation-job-repository";
import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { AcquireHostedGeneratedTranscript } from "@/modules/transcript/application/acquire-hosted-generated-transcript";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { getServerConfig } from "@/platform/config/server";
import { createOriginalEnglishGate } from "@/platform/language/create-language-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";

export function createGenerationRepository(): GenerationJobRepository {
  const config = getServerConfig();
  return config.GENERATION_REPOSITORY === "fake"
    ? getInMemoryGenerationJobRepository()
    : new SupabaseGenerationJobRepository(getAdminSupabaseClient());
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createInlineDispatcher(
  repository: GenerationJobRepository,
): InlineGenerationDispatcher {
  const transcriptRuntime = createTranscriptRuntime(repository);
  const acquireNativeCaption = new AcquireNativeCaption(
    repository,
    transcriptRuntime.repository,
    transcriptRuntime.nativeStrategy,
    transcriptRuntime.nativeEnabled,
  );
  const acquireGenerated = transcriptRuntime.generatedStrategy
    ? new AcquireHostedGeneratedTranscript(
        repository,
        transcriptRuntime.repository,
        transcriptRuntime.generatedStrategy,
        transcriptRuntime.generatedPolicy,
      )
    : undefined;
  const checkOriginalEnglish = createOriginalEnglishGate(
    repository,
    transcriptRuntime.repository,
  );

  async function runLanguageGate(
    jobId: string,
    ownerUserId: string,
  ): Promise<"eligible" | "ineligible" | "insufficient_evidence" | undefined> {
    const latest = await repository.findOwnedById(jobId, ownerUserId);
    if (latest?.status !== "checking_language") return undefined;
    return (await checkOriginalEnglish.execute(latest)).status;
  }

  return new InlineGenerationDispatcher(repository, async (job) => {
    const nativeOutcome = await acquireNativeCaption.execute(job);
    if (nativeOutcome.kind === "retryable_failure") {
      throw new Error(`Native caption retry: ${nativeOutcome.reason}`);
    }

    let useGenerated = nativeOutcome.kind === "not_applicable";
    if (
      nativeOutcome.kind === "persisted" ||
      nativeOutcome.kind === "already_advanced"
    ) {
      useGenerated =
        (await runLanguageGate(job.id, job.ownerUserId)) ===
        "insufficient_evidence";
    }
    if (!useGenerated || !acquireGenerated) return;

    const fallbackJob = await repository.findOwnedById(
      job.id,
      job.ownerUserId,
    );
    if (!fallbackJob) return;
    let generatedOutcome = await acquireGenerated.start(fallbackJob);
    if (generatedOutcome.kind === "retryable_failure") {
      throw new Error(`Generated transcript retry: ${generatedOutcome.reason}`);
    }

    for (
      let pollIndex = 0;
      generatedOutcome.kind === "pending" &&
      pollIndex < transcriptRuntime.generatedMaxPolls;
      pollIndex += 1
    ) {
      await delay(transcriptRuntime.generatedPollIntervalMs);
      const latest = await repository.findOwnedById(job.id, job.ownerUserId);
      if (!latest) return;
      generatedOutcome = await acquireGenerated.poll(
        latest,
        generatedOutcome.providerJobId,
      );
      if (generatedOutcome.kind === "retryable_failure") {
        throw new Error(
          `Generated transcript retry: ${generatedOutcome.reason}`,
        );
      }
    }

    if (generatedOutcome.kind === "pending") {
      const latest = await repository.findOwnedById(job.id, job.ownerUserId);
      if (latest) {
        await acquireGenerated.recordTimeout(
          latest,
          generatedOutcome.providerJobId,
        );
      }
      return;
    }
    if (
      generatedOutcome.kind === "persisted" ||
      generatedOutcome.kind === "already_advanced"
    ) {
      await runLanguageGate(job.id, job.ownerUserId);
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
