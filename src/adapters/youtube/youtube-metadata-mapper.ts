import type { VideoMetadata } from "@/modules/video";
import type { YouTubeVideoResource } from "@/adapters/youtube/youtube-data-api-schemas";

const allowedThumbnailHosts = /^(?:i\d?\.ytimg\.com|img\.youtube\.com)$/i;
const playablePrivacy = new Set(["public", "unlisted"]);

export function parseYouTubeDuration(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match || match.slice(1).every((part) => part === undefined)) return undefined;

  const [days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => Number(part ?? 0));
  const totalSeconds = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  const milliseconds = totalSeconds * 1000;
  return Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
}

function isRegionAllowed(
  restriction: YouTubeVideoResource["contentDetails"]["regionRestriction"],
  viewerRegion: string,
): boolean {
  if (!restriction) return true;
  const region = viewerRegion.toUpperCase();
  if (restriction.allowed) return restriction.allowed.map(String.toUpperCase).includes(region);
  if (restriction.blocked) return !restriction.blocked.map(String.toUpperCase).includes(region);
  return true;
}

function chooseThumbnail(
  thumbnails: YouTubeVideoResource["snippet"]["thumbnails"],
): string | undefined {
  if (!thumbnails) return undefined;
  const preferred = ["maxres", "standard", "high", "medium", "default"];
  for (const key of preferred) {
    const value = thumbnails[key]?.url;
    if (!value) continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol === "https:" && allowedThumbnailHosts.test(parsed.hostname)) {
        return parsed.toString();
      }
    } catch {
      // Ignore corrupt optional thumbnails.
    }
  }
  return undefined;
}

export function mapYouTubeVideo(
  resource: YouTubeVideoResource,
  viewerRegion: string,
  fallbackVersion: string,
): VideoMetadata {
  const common = {
    videoId: resource.id,
    metadataVersion: resource.etag ?? fallbackVersion,
    title: resource.snippet.title,
    channelName: resource.snippet.channelTitle,
    thumbnailUrl: chooseThumbnail(resource.snippet.thumbnails),
    durationMs: parseYouTubeDuration(resource.contentDetails.duration),
    captionAvailable:
      resource.contentDetails.caption === "true"
        ? true
        : resource.contentDetails.caption === "false"
          ? false
          : undefined,
    declaredAudioLanguage: resource.snippet.defaultAudioLanguage,
  };

  if (resource.status.privacyStatus === "private") {
    return { ...common, availability: "private" };
  }

  if (
    resource.status.embeddable === false ||
    !isRegionAllowed(resource.contentDetails.regionRestriction, viewerRegion)
  ) {
    return { ...common, availability: "restricted" };
  }

  if (
    resource.status.uploadStatus !== "processed" ||
    !resource.status.privacyStatus ||
    !playablePrivacy.has(resource.status.privacyStatus) ||
    resource.status.embeddable !== true
  ) {
    return { ...common, availability: "unavailable" };
  }

  return { ...common, availability: "playable" };
}
