import type { VideoMetadata } from "@/modules/video/domain/video-metadata";

export class VideoMetadataProviderFailure extends Error {
  readonly name = "VideoMetadataProviderFailure";

  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export interface VideoMetadataProvider {
  lookup(videoId: string): Promise<VideoMetadata>;
}
