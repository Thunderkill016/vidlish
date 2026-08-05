import "server-only";

import { inngest } from "@/adapters/inngest/client";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import { getServerConfig } from "@/platform/config/server";
import {
  generationRequestedEventId,
  generationRequestedEventSchema,
  type GenerationRequestedEvent,
} from "@/shared/contracts/generation";

export class InngestGenerationDispatcher implements GenerationDispatcher {
  async sendRequested(event: GenerationRequestedEvent): Promise<void> {
    const config = getServerConfig();
    if (!config.INNGEST_EVENT_KEY) {
      throw new Error("Generation dispatcher configuration is invalid.");
    }

    const validated = generationRequestedEventSchema.parse(event);
    await inngest.send({
      id: generationRequestedEventId(validated),
      name: "lesson.generation-requested.v1",
      data: validated,
    });
  }
}
