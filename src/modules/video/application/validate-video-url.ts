import { parseYouTubeUrl } from "@/modules/video/domain/youtube-url";
import type { PlayableVideoMetadata } from "@/modules/video/domain/video-metadata";
import {
  VideoMetadataProviderFailure,
  type VideoMetadataProvider,
} from "@/modules/video/ports/video-metadata-provider";
import { videoErrors } from "@/shared/errors/product-error";

export class ValidateVideoUrl {
  constructor(private readonly provider: VideoMetadataProvider) {}

  async execute(input: { url: string }): Promise<PlayableVideoMetadata> {
    const videoId = parseYouTubeUrl(input.url);

    let metadata;
    try {
      metadata = await this.provider.lookup(videoId);
    } catch (error) {
      if (error instanceof VideoMetadataProviderFailure) {
        throw videoErrors.metadataFailed(error.retryable);
      }
      throw videoErrors.metadataFailed(true);
    }

    switch (metadata.availability) {
      case "playable":
        return metadata;
      case "not_found":
        throw videoErrors.notFound();
      case "private":
        throw videoErrors.private();
      case "restricted":
        throw videoErrors.restricted();
      case "unavailable":
        throw videoErrors.unavailable();
      case "metadata_failed":
        throw videoErrors.metadataFailed(true);
    }
  }
}
