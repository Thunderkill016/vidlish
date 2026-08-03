import type { VideoMetadataProvider } from "@/modules/video/ports/video-metadata-provider";
import type { GenerationDispatcher } from "@/modules/generation/ports/generation-dispatcher";
import type { GenerationJobRepository } from "@/modules/generation/ports/generation-job-repository";
import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import {
  GENERATION_PIPELINE_VERSION,
  generationRequestedEventSchema,
  type CreateLessonJobRequest,
  type CreateLessonJobResponse,
} from "@/shared/contracts/generation";
import { videoErrors } from "@/shared/errors/product-error";

function assertPlayable(availability: string): void {
  switch (availability) {
    case "playable":
      return;
    case "not_found":
      throw videoErrors.notFound();
    case "private":
      throw videoErrors.private();
    case "restricted":
      throw videoErrors.restricted();
    case "unavailable":
      throw videoErrors.unavailable();
    default:
      throw videoErrors.metadataFailed();
  }
}

export class CreateLessonJob {
  constructor(
    private readonly repository: GenerationJobRepository,
    private readonly metadataProvider: VideoMetadataProvider,
    private readonly dispatcher: GenerationDispatcher,
    private readonly policy: GenerationPolicy,
  ) {}

  async execute(
    ownerUserId: string,
    input: CreateLessonJobRequest,
  ): Promise<CreateLessonJobResponse> {
    this.policy.assertCanCreate(
      await this.repository.getPolicySnapshot(ownerUserId),
    );

    const metadata = await this.metadataProvider.lookup(input.videoId);
    assertPlayable(metadata.availability);
    if (metadata.availability !== "playable") {
      throw videoErrors.metadataFailed(false);
    }

    const result = await this.repository.createOrReuse({
      ownerUserId,
      cefrLevel: input.cefrLevel,
      metadata,
      pipelineVersion: GENERATION_PIPELINE_VERSION,
    });

    if (result.created || result.job.dispatchStatus !== "sent") {
      const event = generationRequestedEventSchema.parse({
        jobId: result.job.id,
        pipelineVersion: GENERATION_PIPELINE_VERSION,
      });
      try {
        await this.dispatcher.sendRequested(event);
        await this.repository.markDispatch(result.job.id, "sent");
      } catch {
        await this.repository.markDispatch(result.job.id, "failed");
      }
    }

    return { jobId: result.job.id, reused: !result.created };
  }
}
