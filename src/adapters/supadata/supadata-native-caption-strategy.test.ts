import { describe, expect, it, vi } from "vitest";

import { SupadataNativeCaptionStrategy } from "@/adapters/supadata/supadata-native-caption-strategy";

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SupadataNativeCaptionStrategy", () => {
  it("asks for the English track when YouTube declares English audio", async () => {
    // A TED talk in English came back as a translated track — english_share
    // zero across three thousand words — and the original-English gate refused
    // it, correctly. The declared audio language is what makes asking safe.
    const fetchMock = vi.fn<typeof fetch>(async () =>
      response({
        content: [{ text: "Original speech", offset: 100, duration: 900, lang: "en" }],
        lang: "en",
        availableLangs: ["en", "ar"],
      }),
    );
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "server-secret",
      timeoutMs: 1000,
      fetchImpl: fetchMock,
    });

    await strategy.acquire({ videoId: "M7lc1UVf-VE", declaredAudioLanguage: "en-US" });

    const requested = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(requested.searchParams.get("lang")).toBe("en");
    expect(requested.searchParams.get("mode")).toBe("native");
  });

  it("never asks for English when the audio is declared as something else", async () => {
    // The dangerous half. On a Spanish video an English track is a
    // translation, and teaching from a translation breaks the invariant that
    // source quotes are exact spoken English.
    const fetchMock = vi.fn<typeof fetch>(async () =>
      response({
        content: [{ text: "Habla original", offset: 100, duration: 900, lang: "es" }],
        lang: "es",
        availableLangs: ["es", "en"],
      }),
    );
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "server-secret",
      timeoutMs: 1000,
      fetchImpl: fetchMock,
    });

    await strategy.acquire({ videoId: "M7lc1UVf-VE", declaredAudioLanguage: "es" });

    const requested = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(requested.searchParams.get("lang")).toBeNull();
  });

  it("uses the universal native timestamp endpoint without a language override", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      response({
        content: [
          { text: "Original speech", offset: 100, duration: 900, lang: "en" },
        ],
        lang: "en",
        availableLangs: ["en", "vi"],
      }),
    );
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "server-secret",
      timeoutMs: 1000,
      fetchImpl: fetchMock,
    });

    const result = await strategy.acquire({ videoId: "dQw4w9WgXcQ" });

    expect(result).toMatchObject({
      kind: "success",
      candidate: {
        declaredLanguage: "en",
        trackKind: "unknown",
        translationStatus: "unknown",
      },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe("https://api.supadata.ai/v1/transcript");
    expect(url.searchParams.get("mode")).toBe("native");
    expect(url.searchParams.get("text")).toBe("false");
    expect(url.searchParams.has("lang")).toBe(false);
    expect(url.searchParams.get("url")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(requestInit?.headers).toEqual({ "x-api-key": "server-secret" });
  });

  it("maps transcript-unavailable and empty content to no usable captions", async () => {
    const unavailable = new SupadataNativeCaptionStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () =>
        response(
          {
            error: "transcript-unavailable",
            message: "Transcript Unavailable",
          },
          206,
        ),
    });
    expect(await unavailable.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "not_applicable",
      reason: "NO_USABLE_CAPTIONS",
    });

    const empty = new SupadataNativeCaptionStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () =>
        response({ content: [], lang: "en", availableLangs: ["en"] }),
    });
    expect(await empty.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "not_applicable",
      reason: "NO_USABLE_CAPTIONS",
    });
  });

  it.each([
    [202, { jobId: "async-job" }, "retryable_failure", "ASYNC_NATIVE_RESPONSE"],
    [401, { error: "unauthorized" }, "terminal_failure", "PROVIDER_UNAUTHORIZED"],
    [402, { error: "upgrade-required" }, "terminal_failure", "PROVIDER_PAYMENT_REQUIRED"],
    [429, { error: "limit-exceeded" }, "retryable_failure", "PROVIDER_RATE_LIMITED"],
    [503, { error: "internal-error" }, "retryable_failure", "PROVIDER_UNAVAILABLE"],
  ])("classifies HTTP %s safely", async (status, body, kind, reason) => {
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () => response(body, status),
    });
    expect(await strategy.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind,
      reason,
    });
  });

  it("classifies an aborted provider request as retryable timeout", async () => {
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () => {
        throw new DOMException("Timed out", "TimeoutError");
      },
    });
    expect(await strategy.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "retryable_failure",
      reason: "PROVIDER_TIMEOUT",
    });
  });

  it("fails closed on corrupt provider payload", async () => {
    const strategy = new SupadataNativeCaptionStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () =>
        response({
          content: [{ text: "missing timing", lang: "en" }],
          lang: "en",
          availableLangs: ["en"],
        }),
    });
    expect(await strategy.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "terminal_failure",
      reason: "PROVIDER_RESPONSE_INVALID",
    });
  });
});
