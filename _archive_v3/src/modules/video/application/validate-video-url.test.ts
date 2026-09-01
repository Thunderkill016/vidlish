import { describe, expect, it, vi } from "vitest";

import { ValidateVideoUrl } from "@/modules/video/application/validate-video-url";
import {
  VideoMetadataProviderFailure,
  type VideoMetadataProvider,
} from "@/modules/video/ports/video-metadata-provider";

function provider(
  lookup: VideoMetadataProvider["lookup"],
): VideoMetadataProvider {
  return { lookup };
}

describe("ValidateVideoUrl", () => {
  it("does not call provider for invalid URL", async () => {
    const lookup = vi.fn();
    const service = new ValidateVideoUrl(provider(lookup));
    await expect(service.execute({ url: "https://evil.example" })).rejects.toMatchObject({
      code: "VIDEO_URL_INVALID",
    });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("returns playable metadata", async () => {
    const service = new ValidateVideoUrl(
      provider(async (videoId) => ({
        videoId,
        metadataVersion: "fixture:v1",
        availability: "playable",
        title: "Example",
        channelName: "Channel",
      })),
    );
    await expect(
      service.execute({ url: "https://youtu.be/dQw4w9WgXcQ" }),
    ).resolves.toMatchObject({ availability: "playable", title: "Example" });
  });

  it.each([
    ["not_found", "VIDEO_NOT_FOUND"],
    ["private", "VIDEO_PRIVATE"],
    ["restricted", "VIDEO_RESTRICTED"],
    ["unavailable", "VIDEO_UNAVAILABLE"],
  ] as const)("maps %s to stable product error", async (availability, code) => {
    const service = new ValidateVideoUrl(
      provider(async (videoId) => ({
        videoId,
        metadataVersion: "fixture:v1",
        availability,
        ...(availability === "not_found"
          ? {}
          : { title: "Example", channelName: "Channel" }),
      })),
    );
    await expect(
      service.execute({ url: "https://youtu.be/dQw4w9WgXcQ" }),
    ).rejects.toMatchObject({ code });
  });

  it("preserves provider retryability", async () => {
    const service = new ValidateVideoUrl(
      provider(async () => {
        throw new VideoMetadataProviderFailure("temporary", true);
      }),
    );
    await expect(
      service.execute({ url: "https://youtu.be/dQw4w9WgXcQ" }),
    ).rejects.toMatchObject({ code: "VIDEO_METADATA_FAILED", retryable: true });
  });
});
