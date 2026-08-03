import "server-only";

import { inngest } from "@/adapters/inngest/client";
import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { generationRequestedEventSchema } from "@/shared/contracts/generation";

const repository = createGenerationRepository();

export const generateLessonWorkflow = inngest.createFunction(
  {
    id: "generate-lesson-workflow",
    name: "Generate lesson",
    triggers: { event: "lesson.generation-requested.v1" },
    idempotency:
      'event.data.jobId + "-" + event.data.pipelineVersion',
    concurrency: {
      limit: 1,
      key: "event.data.jobId",
    },
    retries: 5,
  },
  async ({ event, step }) => {
    const payload = generationRequestedEventSchema.parse(event.data);
    const job = await step.run("advance-to-transcript-acquisition", () =>
      repository.advanceStory21(payload.jobId),
    );
    return { jobId: payload.jobId, status: job?.status ?? "missing" };
  },
);
