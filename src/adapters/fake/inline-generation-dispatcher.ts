import "server-only";

import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import type {
  GenerationJob,
  GenerationRequestedEvent,
} from "@/shared/contracts/generation";

export class InlineGenerationDispatcher implements GenerationDispatcher {
  constructor(
    private readonly repository: GenerationJobRepository,
    private readonly afterAcquisitionStart?: (job: GenerationJob) => Promise<void>,
  ) {}

  async sendRequested(event: GenerationRequestedEvent): Promise<void> {
    const job = await this.repository.advanceStory21(event.jobId);
    if (job && this.afterAcquisitionStart) {
      await this.afterAcquisitionStart(job);
    }
  }
}
