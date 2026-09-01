import "server-only";

import { FixtureVideoMetadataProvider } from "@/adapters/youtube/fixture-video-metadata-provider";
import { YouTubeDataApiProvider } from "@/adapters/youtube/youtube-data-api-provider";
import type { VideoMetadataProvider } from "@/modules/video";
import { getServerConfig } from "@/platform/config/server";
import { videoErrors } from "@/shared/errors/product-error";

export function createVideoMetadataProvider(): VideoMetadataProvider {
  let config;
  try {
    config = getServerConfig();
  } catch {
    throw videoErrors.metadataFailed(false);
  }

  if (config.VIDEO_METADATA_ADAPTER === "fixture") {
    return new FixtureVideoMetadataProvider();
  }

  if (!config.YOUTUBE_DATA_API_KEY) {
    throw videoErrors.metadataFailed(false);
  }

  return new YouTubeDataApiProvider(
    config.YOUTUBE_DATA_API_KEY,
    config.YOUTUBE_VIEWER_REGION,
    config.YOUTUBE_METADATA_TIMEOUT_MS,
  );
}
