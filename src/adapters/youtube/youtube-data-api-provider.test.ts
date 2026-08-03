import { describe, expect, it, vi } from "vitest";

import { YouTubeDataApiProvider } from "@/adapters/youtube/youtube-data-api-provider";

const videoId = "dQw4w9WgXcQ";

function validBody() {
  return {
    etag: "list-etag",
    items: [
      {
        id: videoId,
        etag: "item-etag",
        snippet: {
          title: "Example",
          channelTitle: "Channel",
          defaultAudioLanguage: "en",
          thumbnails: {
            high: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
          },
        },
        contentDetails: { duration: "PT2M", caption: "true" },
        status: {
          uploadStatus: "processed",
          privacyStatus: "public",
          embeddable: true,
        },
      },
    ],
  };
}

describe("YouTubeDataApiProvider", () => {
  it("calls videos.list with exact parts and maps a valid response", async () => {
    const fetchMock = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      expect(url.origin + url.pathname).toBe(
        "https://www.googleapis.com/youtube/v3/videos",
      );
      expect(url.searchParams.get("id")).toBe(videoId);
      expect(url.searchParams.get("part")).toBe("snippet,contentDetails,status");
      expect(url.searchParams.get("key")).toBe("secret-test-key");
      return new Response(JSON.stringify(validBody()), { status: 200 });
    });

    const provider = new YouTubeDataApiProvider(
      "secret-test-key",
      "VN",
      1000,
      fetchMock as typeof fetch,
    );

    await expect(provider.lookup(videoId)).resolves.toMatchObject({
      availability: "playable",
      videoId,
      title: "Example",
    });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("maps an empty item list to not_found without false precision", async () => {
    const provider = new YouTubeDataApiProvider(
      "key",
      "VN",
      1000,
      vi.fn(async () =>
        new Response(JSON.stringify({ etag: "empty", items: [] }), { status: 200 }),
      ) as typeof fetch,
    );
    await expect(provider.lookup(videoId)).resolves.toEqual({
      videoId,
      metadataVersion: "empty",
      availability: "not_found",
    });
  });

  it.each([
    [429, true],
    [500, true],
    [403, false],
  ])("classifies HTTP %s retryability", async (status, retryable) => {
    const provider = new YouTubeDataApiProvider(
      "secret-value",
      "VN",
      1000,
      vi.fn(async () => new Response("provider detail", { status })) as typeof fetch,
    );
    await expect(provider.lookup(videoId)).rejects.toMatchObject({ retryable });
    await expect(provider.lookup(videoId)).rejects.not.toThrow("secret-value");
  });

  it("rejects corrupt JSON payload, contradictory region policy and timeout", async () => {
    const corrupt = new YouTubeDataApiProvider(
      "key",
      "VN",
      1000,
      vi.fn(async () => new Response("not-json", { status: 200 })) as typeof fetch,
    );
    await expect(corrupt.lookup(videoId)).rejects.toMatchObject({ retryable: false });

    const baseBody = validBody();
    const contradictoryBody = {
      ...baseBody,
      items: [
        {
          ...baseBody.items[0],
          contentDetails: {
            ...baseBody.items[0].contentDetails,
            regionRestriction: {
              allowed: ["VN"],
              blocked: ["US"],
            },
          },
        },
      ],
    };
    const contradictory = new YouTubeDataApiProvider(
      "key",
      "VN",
      1000,
      vi.fn(async () =>
        new Response(JSON.stringify(contradictoryBody), { status: 200 }),
      ) as typeof fetch,
    );
    await expect(contradictory.lookup(videoId)).rejects.toMatchObject({
      retryable: false,
    });

    const timeout = new YouTubeDataApiProvider(
      "key",
      "VN",
      10,
      vi.fn(async () => {
        throw new DOMException("timed out", "TimeoutError");
      }) as typeof fetch,
    );
    await expect(timeout.lookup(videoId)).rejects.toMatchObject({ retryable: true });
  });
});
