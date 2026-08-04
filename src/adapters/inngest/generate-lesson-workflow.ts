import "server-only";

import { inngest } from "@/adapters/inngest/client";
import { AcquireHostedGeneratedTranscript } from "@/modules/transcript/application/acquire-hosted-generated-transcript";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { createOriginalEnglishGate } from "@/platform/language/create-language-runtime";
import { createTranscriptRuntime } from "@/platform/transcript/create-transcript-runtime";
import { generationRequestedEventSchema } from "@/shared/contracts/generation";

const generationRepository = createGenerationRepository();
const transcriptRuntime = createTranscriptRuntime(generationRepository);
const acquireNativeCaption = new AcquireNativeCaption(
  generationRepository,
  transcriptRuntime.repository,
  transcriptRuntime.nativeStrategy,
  transcriptRuntime.nativeEnabled,
);
const acquireGenerated = transcriptRuntime.generatedStrategy
  ? new AcquireHostedGeneratedTranscript(
      generationRepository,
      transcriptRuntime.repository,
      transcriptRuntime.generatedStrategy,
      transcriptRuntime.generatedPolicy,
    )
  : undefined;
const checkOriginalEnglish = createOriginalEnglishGate(
  generationRepository,
  transcriptRuntime.repository,
);

const transientProviderReasons = new Set([
  "PROVIDER_TIMEOUT",
  "PROVIDER_RATE_LIMITED",
  "PROVIDER_UNAVAILABLE",
]);

export const generateLessonWorkflow = inngest.createFunction(
  {
    id: "generate-lesson-workflow",
    name: "Generate lesson",
    triggers: { event: "lesson.generation-requested.v1" },
    idempotency: 'event.data.jobId + "-" + event.data.pipelineVersion',
    concurrency: { limit: 1, key: "event.data.jobId" },
    retries: 5,
  },
  async ({ event, step }) => {
    const payload = generationRequestedEventSchema.parse(event.data);
    const jobRef = await step.run(
      "advance-to-transcript-acquisition",
      async () => {
        const job = await generationRepository.advanceStory21(payload.jobId);
        return job
          ? { jobId: job.id, ownerUserId: job.ownerUserId, status: job.status }
          : null;
      },
    );
    if (!jobRef) return { jobId: payload.jobId, status: "missing" };

    const nativeOutcome = await step.run("acquire-native-caption", async () => {
      const job = await generationRepository.findOwnedById(
        jobRef.jobId,
        jobRef.ownerUserId,
      );
      if (!job) return { kind: "missing" } as const;
      const result = await acquireNativeCaption.execute(job);
      if (result.kind === "retryable_failure") {
        throw new Error(`Native caption retry: ${result.reason}`);
      }
      return result;
    });

    let languageOutcome: string | undefined;
    let useGenerated =
      nativeOutcome.kind === "not_applicable" ||
      (nativeOutcome.kind === "terminal_failure" &&
        nativeOutcome.reason === "STRATEGY_DISABLED");

    if (
      nativeOutcome.kind === "persisted" ||
      nativeOutcome.kind === "already_advanced"
    ) {
      const languageResult = await step.run(
        "check-original-english-native",
        async () => {
          const latest = await generationRepository.findOwnedById(
            jobRef.jobId,
            jobRef.ownerUserId,
          );
          if (!latest) return { status: "missing", reportId: null } as const;
          if (latest.status !== "checking_language") {
            return { status: latest.status, reportId: null } as const;
          }
          const decision = await checkOriginalEnglish.execute(latest);
          return { status: decision.status, reportId: decision.reportId };
        },
      );
      languageOutcome = languageResult.status;
      useGenerated = languageResult.status === "insufficient_evidence";
    }

    let generatedOutcomeKind: string | undefined;
    if (useGenerated && acquireGenerated) {
      let generatedOutcome = await step.run(
        "start-hosted-generated-transcript",
        async () => {
          const latest = await generationRepository.findOwnedById(
            jobRef.jobId,
            jobRef.ownerUserId,
          );
          if (!latest) return { kind: "missing" } as const;
          const result = await acquireGenerated.start(latest);
          if (
            result.kind === "retryable_failure" &&
            transientProviderReasons.has(result.reason)
          ) {
            throw new Error(`Generated transcript retry: ${result.reason}`);
          }
          return result;
        },
      );

      for (
        let pollIndex = 0;
        generatedOutcome.kind === "pending" &&
        pollIndex < transcriptRuntime.generatedMaxPolls;
        pollIndex += 1
      ) {
        await step.sleep(
          `wait-hosted-generated-${pollIndex + 1}`,
          transcriptRuntime.generatedPollIntervalMs,
        );
        const providerJobId = generatedOutcome.providerJobId;
        generatedOutcome = await step.run(
          `poll-hosted-generated-${pollIndex + 1}`,
          async () => {
            const latest = await generationRepository.findOwnedById(
              jobRef.jobId,
              jobRef.ownerUserId,
            );
            if (!latest) return { kind: "missing" } as const;
            const result = await acquireGenerated.poll(
              latest,
              providerJobId,
            );
            if (
              result.kind === "retryable_failure" &&
              transientProviderReasons.has(result.reason)
            ) {
              throw new Error(`Generated poll retry: ${result.reason}`);
            }
            return result;
          },
        );
      }

      if (generatedOutcome.kind === "pending") {
        const providerJobId = generatedOutcome.providerJobId;
        generatedOutcome = await step.run(
          "expire-hosted-generated-transcript",
          async () => {
            const latest = await generationRepository.findOwnedById(
              jobRef.jobId,
              jobRef.ownerUserId,
            );
            if (!latest) return { kind: "missing" } as const;
            return acquireGenerated.recordTimeout(latest, providerJobId);
          },
        );
      }
      generatedOutcomeKind = generatedOutcome.kind;

      if (
        generatedOutcome.kind === "persisted" ||
        generatedOutcome.kind === "already_advanced"
      ) {
        const languageResult = await step.run(
          "check-original-english-generated",
          async () => {
            const latest = await generationRepository.findOwnedById(
              jobRef.jobId,
              jobRef.ownerUserId,
            );
            if (!latest) return { status: "missing", reportId: null } as const;
            if (latest.status !== "checking_language") {
              return { status: latest.status, reportId: null } as const;
            }
            const decision = await checkOriginalEnglish.execute(latest);
            return { status: decision.status, reportId: decision.reportId };
          },
        );
        languageOutcome = languageResult.status;
      }
    }

    const finalStatus = await step.run(
      "load-final-generation-state",
      async () =>
        (
          await generationRepository.findOwnedById(
            jobRef.jobId,
            jobRef.ownerUserId,
          )
        )?.status ?? "missing",
    );

    return {
      jobId: payload.jobId,
      status: finalStatus,
      nativeOutcome: nativeOutcome.kind,
      ...(generatedOutcomeKind
        ? { generatedOutcome: generatedOutcomeKind }
        : {}),
      ...(languageOutcome ? { languageOutcome } : {}),
    };
  },
);
