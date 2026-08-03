import "server-only";

import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type { GenerationRequestedEvent } from "@/shared/contracts/generation";

export class InlineGenerationDispatcher implements GenerationDispatcher {
  constructor(private readonly repository: GenerationJobRepository) {}

  async sendRequested(event: GenerationRequestedEvent): Promise<void> {
    await this.repository.advanceStory21(event.jobId);
  }
}
