import "server-only";

import { inngest } from "@/adapters/inngest/client";
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
  transcriptRuntime.strategy,
  transcriptRuntime.enabled,
);
const checkOriginalEnglish = createOriginalEnglishGate(
  generationRepository,
  transcriptRuntime.repository,
);

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
        const job = await generationRepository.beginTranscriptAcquisition(
          payload.jobId,
        );
        return job
          ? {
              jobId: job.id,
              ownerUserId: job.ownerUserId,
              status: job.status,
            }
          : null;
      },
    );
    if (!jobRef) return { jobId: payload.jobId, status: "missing" };

    const transcriptOutcome = await step.run(
      "acquire-native-caption",
      async () => {
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
      },
    );

    let languageOutcome: string | undefined;
    if (
      transcriptOutcome.kind === "persisted" ||
      transcriptOutcome.kind === "already_advanced"
    ) {
      const languageResult = await step.run(
        "check-original-english",
        async () => {
          const latest = await generationRepository.findOwnedById(
            jobRef.jobId,
            jobRef.ownerUserId,
          );
          if (!latest) return { status: "missing", decision: null } as const;
          if (latest.status !== "checking_language") {
            return { status: latest.status, decision: null } as const;
          }

          const decision = await checkOriginalEnglish.execute(latest);
          return {
            status: decision.status,
            decision: {
              reportId: decision.reportId,
              created: decision.created,
            },
          };
        },
      );
      languageOutcome = languageResult.status;
    }

    // Acquisition gave up, or the language gate asked for a better source. Both
    // land here so exhaustion is decided in one place. Weak evidence is never
    // reported as an unsupported source language.
    const needsAnotherSource =
      transcriptOutcome.kind === "not_applicable" ||
      transcriptOutcome.kind === "terminal_failure" ||
      languageOutcome === "insufficient_evidence";

    if (needsAnotherSource) {
      await step.run("resolve-transcript-exhaustion", async () => {
        const latest = await generationRepository.findOwnedById(
          jobRef.jobId,
          jobRef.ownerUserId,
        );
        if (!latest) return { kind: "missing" } as const;
        if (await transcriptRuntime.orchestrator.hasUntriedStrategy(latest)) {
          return { kind: "strategy_remaining" } as const;
        }
        await generationRepository.markTranscriptExhausted(
          latest.id,
          latest.ownerUserId,
          languageOutcome === "insufficient_evidence"
            ? "TRANSCRIPT_EVIDENCE_TOO_WEAK"
            : "NO_USABLE_TRANSCRIPT",
        );
        return { kind: "terminated" } as const;
      });
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
      transcriptOutcome: transcriptOutcome.kind,
      ...(languageOutcome ? { languageOutcome } : {}),
    };
  },
);
