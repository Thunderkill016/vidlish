import "server-only";

import type { VideoMetadata, VideoMetadataProvider } from "@/modules/video";
import { VideoMetadataProviderFailure } from "@/modules/video";

export const fixtureVideoIds = {
  playable: "dQw4w9WgXcQ",
  notFound: "notfound001",
  restricted: "restricted1",
  unavailable: "unavail0001",
  retryableFailure: "retryfail01",
} as const;

export class FixtureVideoMetadataProvider implements VideoMetadataProvider {
  async lookup(videoId: string): Promise<VideoMetadata> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    if (videoId === fixtureVideoIds.retryableFailure) {
      throw new VideoMetadataProviderFailure("fixture transient failure", true);
    }
    if (videoId === fixtureVideoIds.notFound) {
      return {
        videoId,
        metadataVersion: "fixture:v1:not-found",
        availability: "not_found",
      };
    }

    const base = {
      videoId,
      metadataVersion: `fixture:v1:${videoId}`,
      title: "How to build a better learning habit",
      channelName: "Vidlish Test Channel",
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      durationMs: 15 * 60 * 1000 + 33 * 1000,
      captionAvailable: true,
      declaredAudioLanguage: "en",
    };

    if (videoId === fixtureVideoIds.restricted) {
      return { ...base, availability: "restricted" };
    }
    if (videoId === fixtureVideoIds.unavailable) {
      return { ...base, availability: "unavailable" };
    }
    return { ...base, availability: "playable" };
  }
}
