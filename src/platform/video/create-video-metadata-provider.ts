import "server-only";

import { FixtureVideoMetadataProvider } from "@/adapters/youtube/fixture-video-metadata-provider";
import { YouTubeDataApiProvider } from "@/adapters/youtube/youtube-data-api-provider";
import type { VideoMetadataProvider } from "@/modules/video";
import { getServerConfig } from "@/platform/config/server";

export function createVideoMetadataProvider(): VideoMetadataProvider {
  const config = getServerConfig();
  if (config.VIDEO_METADATA_ADAPTER === "fixture") {
    return new FixtureVideoMetadataProvider();
  }

  return new YouTubeDataApiProvider(
    config.YOUTUBE_DATA_API_KEY!,
    config.YOUTUBE_VIEWER_REGION,
    config.YOUTUBE_METADATA_TIMEOUT_MS,
  );
}
