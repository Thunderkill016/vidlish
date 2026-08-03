import "server-only";

import { inngest } from "@/adapters/inngest/client";
import { AcquireNativeCaption } from "@/modules/transcript/application/acquire-native-caption";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
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
    const job = await step.run("advance-to-transcript-acquisition", () =>
      generationRepository.advanceStory21(payload.jobId),
    );
    if (!job) return { jobId: payload.jobId, status: "missing" };

    const outcome = await step.run("acquire-native-caption", async () => {
      const result = await acquireNativeCaption.execute(job);
      if (result.kind === "retryable_failure") {
        throw new Error(`Native caption retry: ${result.reason}`);
      }
      return result;
    });

    return {
      jobId: payload.jobId,
      status:
        outcome.kind === "persisted" || outcome.kind === "already_advanced"
          ? "checking_language"
          : job.status,
      transcriptOutcome: outcome.kind,
    };
  },
);
