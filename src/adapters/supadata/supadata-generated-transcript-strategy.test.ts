import { describe, expect, it, vi } from "vitest";

import { SupadataGeneratedTranscriptStrategy } from "@/adapters/supadata/supadata-generated-transcript-strategy";

function response(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const completedTranscript = {
  content: [
    {
      text: "Original source speech",
      offset: 0,
      duration: 1500,
      lang: "en",
    },
  ],
  lang: "en",
  availableLangs: ["en"],
};

describe("SupadataGeneratedTranscriptStrategy", () => {
  it("uses generated mode with timestamps and no language override", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      response(completedTranscript, 200, { "x-request-id": "req-1" }),
    );
    const strategy = new SupadataGeneratedTranscriptStrategy({
      apiKey: "server-secret",
      timeoutMs: 1000,
      fetchImpl: fetchMock,
    });

    const result = await strategy.acquire({ videoId: "dQw4w9WgXcQ" });

    expect(result).toMatchObject({
      kind: "success",
      candidate: {
        strategyId: "supadata-generated-transcript",
        sourceType: "hosted_generated_transcript",
        providerRequestId: "req-1",
        translationStatus: "original",
      },
    });
    const [requestUrl, requestInit] = fetchMock.mock.calls[0];
    const url = new URL(String(requestUrl));
    expect(url.origin + url.pathname).toBe("https://api.supadata.ai/v1/transcript");
    expect(url.searchParams.get("mode")).toBe("generate");
    expect(url.searchParams.get("text")).toBe("false");
    expect(url.searchParams.has("lang")).toBe(false);
    expect(url.searchParams.get("url")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    );
    expect(requestInit?.headers).toEqual({ "x-api-key": "server-secret" });
  });

  it("returns a safe pending result and polls queued to completed", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({ jobId: "provider_job_1" }, 202, {
          "x-request-id": "start-req",
        }),
      )
      .mockResolvedValueOnce(
        response({ status: "queued" }, 200, { "x-request-id": "poll-1" }),
      )
      .mockResolvedValueOnce(
        response(
          { status: "completed", ...completedTranscript },
          200,
          { "x-request-id": "poll-2" },
        ),
      );
    const strategy = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: fetchMock,
    });

    const started = await strategy.acquire({ videoId: "dQw4w9WgXcQ" });
    expect(started).toEqual({
      kind: "pending",
      providerJobId: "provider_job_1",
      providerRequestId: "start-req",
    });
    const pending = await strategy.poll({
      providerJobId: "provider_job_1",
      videoId: "dQw4w9WgXcQ",
    });
    expect(pending).toEqual({
      kind: "pending",
      providerJobId: "provider_job_1",
      providerRequestId: "poll-1",
    });
    const completed = await strategy.poll({
      providerJobId: "provider_job_1",
      videoId: "dQw4w9WgXcQ",
    });
    expect(completed).toMatchObject({
      kind: "success",
      candidate: { providerRequestId: "poll-2" },
    });
    expect(String(fetchMock.mock.calls[1][0])).toBe(
      "https://api.supadata.ai/v1/transcript/provider_job_1",
    );
  });

  it("maps empty generated output to no speech", async () => {
    const strategy = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () =>
        response({ content: [], lang: "en", availableLangs: ["en"] }),
    });
    expect(await strategy.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "not_applicable",
      reason: "NO_SPEECH_DETECTED",
    });
  });

  it.each([
    [401, "terminal_failure", "PROVIDER_UNAUTHORIZED"],
    [402, "terminal_failure", "PROVIDER_PAYMENT_REQUIRED"],
    [404, "terminal_failure", "UNSUPPORTED_RESOURCE"],
    [429, "retryable_failure", "PROVIDER_RATE_LIMITED"],
    [503, "retryable_failure", "PROVIDER_UNAVAILABLE"],
  ])("classifies start HTTP %s safely", async (status, kind, reason) => {
    const strategy = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () => response({ error: "safe-error" }, status),
    });
    expect(await strategy.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind,
      reason,
    });
  });

  it("maps poll failure and missing jobs without leaking provider payload", async () => {
    const missing = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () => response({ error: "not-found" }, 404),
    });
    expect(
      await missing.poll({
        providerJobId: "provider_job_1",
        videoId: "dQw4w9WgXcQ",
      }),
    ).toEqual({
      kind: "terminal_failure",
      reason: "PROVIDER_JOB_NOT_FOUND",
    });

    const failed = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () =>
        response({
          status: "failed",
          error: { error: "internal-error", message: "provider detail" },
        }),
    });
    expect(
      await failed.poll({
        providerJobId: "provider_job_1",
        videoId: "dQw4w9WgXcQ",
      }),
    ).toEqual({
      kind: "retryable_failure",
      reason: "PROVIDER_JOB_FAILED",
    });
  });

  it("classifies timeout and rejects unsafe provider job IDs", async () => {
    const timeout = new SupadataGeneratedTranscriptStrategy({
      apiKey: "secret",
      timeoutMs: 1000,
      fetchImpl: async () => {
        throw new DOMException("Timed out", "TimeoutError");
      },
    });
    expect(await timeout.acquire({ videoId: "dQw4w9WgXcQ" })).toEqual({
      kind: "retryable_failure",
      reason: "PROVIDER_TIMEOUT",
    });
    expect(
      await timeout.poll({
        providerJobId: "../../unsafe",
        videoId: "dQw4w9WgXcQ",
      }),
    ).toEqual({
      kind: "terminal_failure",
      reason: "PROVIDER_RESPONSE_INVALID",
    });
  });
});
