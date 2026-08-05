import "server-only";

import { getInMemoryGenerationJobRepository } from "@/adapters/fake/in-memory-generation-job-repository";
import { InlineGenerationDispatcher } from "@/adapters/fake/inline-generation-dispatcher";
import { getAdminSupabaseClient } from "@/adapters/supabase/admin-client";
import { SupabaseGenerationJobRepository } from "@/adapters/supabase/generation-job-repository";
import { WorkflowGenerationDispatcher } from "@/adapters/workflow/generation-dispatcher";
import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { getServerConfig } from "@/platform/config/server";
import { createOriginalEnglishGate } from "@/platform/language/create-language-runtime";
import { createGenerateLesson } from "@/platform/lesson/create-lesson-runtime";
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
  const checkOriginalEnglish = createOriginalEnglishGate(
    repository,
    transcriptRuntime.repository,
  );

  const generateLesson = createGenerateLesson(
    repository,
    transcriptRuntime.repository,
  );

  return new InlineGenerationDispatcher(repository, async (job) => {
    const outcome = await acquireNativeCaption.execute(job);
    if (outcome.kind === "retryable_failure") {
      throw new Error(`Native caption retry: ${outcome.reason}`);
    }

    let languageOutcome: string | undefined;
    if (outcome.kind === "persisted" || outcome.kind === "already_advanced") {
      const latest = await repository.findOwnedById(job.id, job.ownerUserId);
      if (latest?.status === "checking_language") {
        languageOutcome = (await checkOriginalEnglish.execute(latest)).status;
      }
    }

    // Parity with the durable workflow: exhaustion is terminal here too, so
    // local and CI runs cannot pass while hosted runs hang.
    const needsAnotherSource =
      outcome.kind === "not_applicable" ||
      outcome.kind === "terminal_failure" ||
      languageOutcome === "insufficient_evidence";

    if (needsAnotherSource) {
      const current = await repository.findOwnedById(job.id, job.ownerUserId);
      if (!current) return;
      if (await transcriptRuntime.orchestrator.hasUntriedStrategy(current)) return;
      await repository.markTranscriptExhausted(
        current.id,
        current.ownerUserId,
        languageOutcome === "insufficient_evidence"
          ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
          : "NO_USABLE_TRANSCRIPT",
      );
      return;
    }

    // Parity with the durable workflow: an eligible source generates a lesson
    // here too, so local and CI exercise the same path hosted runs take. The
    // language gate already ran above — reuse its verdict rather than executing
    // it a second time.
    if (languageOutcome !== "eligible") return;

    const eligible = await repository.findOwnedById(job.id, job.ownerUserId);
    const transcript = await transcriptRuntime.repository.findCanonicalForJob(
      job.ownerUserId,
      job.id,
    );
    if (!eligible || eligible.status !== "analyzing_video" || !transcript) return;
    await generateLesson.execute(eligible, transcript.normalizedHash);
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
      : new WorkflowGenerationDispatcher();
  const policy = new GenerationPolicy({
    maxActiveJobs: config.GENERATION_MAX_ACTIVE_JOBS,
    maxJobsPerDay: config.GENERATION_MAX_JOBS_PER_DAY,
    maxJobsPerMinute: config.GENERATION_MAX_JOBS_PER_MINUTE,
  });
  return { repository, dispatcher, policy };
}
