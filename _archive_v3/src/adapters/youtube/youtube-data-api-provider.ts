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

// YouTube's `fields` parameter does not reduce videos.list quota units, but it
// does reduce response bytes and narrows the external contract to exactly what
// Vidlish validates and persists. Keeping this allowlist next to the adapter
// also makes accidental collection of descriptions/tags less likely.
// Joined with no separator, so every element carries its own punctuation. The
// first one was missing its comma, which glued the parameter into
// `etagitems(...)` — YouTube answered 400 "Invalid field selection etagitems",
// the adapter read a non-429/5xx status as permanent, and every single video
// validation failed with "cấu hình dịch vụ". One character, whole product down.
const RESPONSE_FIELDS = [
  "etag,",
  "items(id,etag,",
  "snippet(title,channelTitle,defaultLanguage,defaultAudioLanguage,thumbnails),",
  "contentDetails(duration,caption,regionRestriction),",
  "status(uploadStatus,privacyStatus,embeddable))",
].join("");

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
    url.searchParams.set("fields", RESPONSE_FIELDS);
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
