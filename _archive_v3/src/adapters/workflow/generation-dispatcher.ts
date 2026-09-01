import "server-only";

import { start } from "workflow/api";

import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import {
  generationRequestedEventSchema,
  type GenerationRequestedEvent,
} from "@/shared/contracts/generation";
import { generateLessonWorkflow } from "@/workflows/generate-lesson";

export class WorkflowGenerationDispatcher implements GenerationDispatcher {
  async sendRequested(event: GenerationRequestedEvent): Promise<void> {
    const validated = generationRequestedEventSchema.parse(event);
    await start(generateLessonWorkflow, [validated]);
  }
}
