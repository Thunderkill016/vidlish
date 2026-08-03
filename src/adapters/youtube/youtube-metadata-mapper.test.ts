import { describe, expect, it } from "vitest";

import type { YouTubeVideoResource } from "@/adapters/youtube/youtube-data-api-schemas";
import {
  mapYouTubeVideo,
  parseYouTubeDuration,
} from "@/adapters/youtube/youtube-metadata-mapper";

function resource(
  overrides: Partial<YouTubeVideoResource> = {},
): YouTubeVideoResource {
  return {
    id: "dQw4w9WgXcQ",
    etag: "item-etag",
    snippet: {
      title: "Example title",
      channelTitle: "Example channel",
      defaultAudioLanguage: "en",
      thumbnails: {
        high: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg" },
      },
    },
    contentDetails: {
      duration: "PT1H2M3S",
      caption: "true",
    },
    status: {
      uploadStatus: "processed",
      privacyStatus: "public",
      embeddable: true,
    },
    ...overrides,
  };
}

describe("YouTube metadata mapper", () => {
  it.each([
    ["PT0S", 0],
    ["PT15M33S", 933000],
    ["PT1H2M3S", 3723000],
    ["P1DT2H", 93600000],
    ["bad", undefined],
    [undefined, undefined],
  ])("parses duration %s", (input, expected) => {
    expect(parseYouTubeDuration(input)).toBe(expected);
  });

  it("maps a public processed embeddable video to playable", () => {
    expect(mapYouTubeVideo(resource(), "VN", "list-etag")).toMatchObject({
      availability: "playable",
      durationMs: 3723000,
      captionAvailable: true,
      metadataVersion: "item-etag",
    });
  });

  it.each([
    [
      "private",
      resource({ status: { uploadStatus: "processed", privacyStatus: "private", embeddable: true } }),
      "private",
    ],
    [
      "not embeddable",
      resource({ status: { uploadStatus: "processed", privacyStatus: "public", embeddable: false } }),
      "restricted",
    ],
    [
      "region blocked",
      resource({
        contentDetails: {
          duration: "PT1M",
          regionRestriction: { blocked: ["VN"] },
        },
      }),
      "restricted",
    ],
    [
      "empty allowlist",
      resource({
        contentDetails: {
          duration: "PT1M",
          regionRestriction: { allowed: [] },
        },
      }),
      "restricted",
    ],
    [
      "empty blocklist",
      resource({
        contentDetails: {
          duration: "PT1M",
          regionRestriction: { blocked: [] },
        },
      }),
      "playable",
    ],
    [
      "processing upload",
      resource({ status: { uploadStatus: "uploaded", privacyStatus: "public", embeddable: true } }),
      "unavailable",
    ],
    [
      "unknown privacy",
      resource({ status: { uploadStatus: "processed", privacyStatus: "mystery", embeddable: true } }),
      "unavailable",
    ],
  ])("maps %s safely", (_name, input, expected) => {
    expect(mapYouTubeVideo(input as YouTubeVideoResource, "VN", "list-etag").availability).toBe(
      expected,
    );
  });

  it("drops an arbitrary thumbnail host", () => {
    const result = mapYouTubeVideo(
      resource({
        snippet: {
          title: "Example",
          channelTitle: "Channel",
          thumbnails: { high: { url: "https://evil.example/image.jpg" } },
        },
      }),
      "VN",
      "list-etag",
    );
    expect(result.thumbnailUrl).toBeUndefined();
  });
});
