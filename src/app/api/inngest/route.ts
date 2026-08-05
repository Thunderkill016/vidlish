import { serve } from "inngest/next";

import { expireStalledJobsWorkflow } from "@/adapters/inngest/expire-stalled-jobs-workflow";
import { generateLessonWorkflow } from "@/adapters/inngest/generate-lesson-workflow";
import { inngest } from "@/adapters/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateLessonWorkflow, expireStalledJobsWorkflow],
});
