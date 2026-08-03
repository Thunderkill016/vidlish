import "server-only";

import {
  videoMetadataSchema,
  type VideoMetadata,
} from "@/shared/contracts/video";
import {
  VideoMetadataProviderFailure,
  type VideoMetadataProvider,
} from "@/modules/video";
import { youtubeVideoListResponseSchema } from "@/adapters/youtube/youtube-data-api-schemas";
import { mapYouTubeVideo } from "@/adapters/youtube/youtube-metadata-mapper";

const endpoint = "https://www.googleapis.com/youtube/v3/videos";

export class YouTubeDataApiProvider implements VideoMetadataProvider {
  constructor(
    private readonly apiKey: string,
    private readonly viewerRegion: string,
    private readonly timeoutMs: number,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async lookup(videoId: string): Promise<VideoMetadata> {
    const url = new URL(endpoint);
    url.searchParams.set("id", videoId);
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("key", this.apiKey);

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
        cache: "no-store",
      });
    } catch (error) {
      const isTimeout =
        error instanceof DOMException &&
        (error.name === "TimeoutError" || error.name === "AbortError");
      throw new VideoMetadataProviderFailure(
        isTimeout ? "YouTube metadata request timed out" : "YouTube metadata request failed",
        true,
      );
    }

    if (!response.ok) {
      throw new VideoMetadataProviderFailure(
        "YouTube metadata provider returned an error",
        response.status === 429 || response.status >= 500,
      );
    }

    let raw: unknown;
    try {
      raw = await response.json();
    } catch {
      throw new VideoMetadataProviderFailure("YouTube metadata response was not JSON", false);
    }

    const parsed = youtubeVideoListResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new VideoMetadataProviderFailure("YouTube metadata response was invalid", false);
    }

    const version = parsed.data.etag ?? "youtube-v3:unversioned";
    const resource = parsed.data.items.find((item) => item.id === videoId);
    if (!resource) {
      return {
        videoId,
        metadataVersion: version,
        availability: "not_found",
      };
    }

    const metadata = mapYouTubeVideo(resource, this.viewerRegion, version);
    const validated = videoMetadataSchema.safeParse(metadata);
    if (!validated.success) {
      throw new VideoMetadataProviderFailure("Canonical video metadata was invalid", false);
    }
    return validated.data;
  }
}
