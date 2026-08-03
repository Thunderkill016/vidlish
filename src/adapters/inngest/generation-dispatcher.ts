import "server-only";

import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import {
  generationRequestedEventId,
  generationRequestedEventSchema,
  type GenerationRequestedEvent,
} from "@/shared/contracts/generation";
import { inngest } from "@/adapters/inngest/client";

export class InngestGenerationDispatcher implements GenerationDispatcher {
  async sendRequested(event: GenerationRequestedEvent): Promise<void> {
    const validated = generationRequestedEventSchema.parse(event);
    await inngest.send({
      id: generationRequestedEventId(validated),
      name: "lesson.generation-requested.v1",
      data: validated,
    });
  }
}
