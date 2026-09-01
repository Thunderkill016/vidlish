import { describe, expect, it, vi } from "vitest";

import {
  buildGenerationEvent,
  emitGenerationEvent,
  generationEventSchema,
} from "./generation-event";

const JOB_ID = "11111111-1111-4111-8111-111111111111";

describe("generation events", () => {
  it("builds a bounded structured event without free-form payloads", () => {
    expect(
      buildGenerationEvent({
        level: "error",
        jobId: JOB_ID,
        stage: "lesson_generation",
        action: "failed",
        provider: "gemini",
        modelId: "gemini-3.5-flash-lite",
        reason: "provider_failure",
        elapsedMs: 13_402,
        retryable: true,
        errorName: "LessonGenerationFailure",
      }),
    ).toEqual({
      event: "vidlish_generation",
      level: "error",
      jobId: JOB_ID,
      stage: "lesson_generation",
      action: "failed",
      provider: "gemini",
      modelId: "gemini-3.5-flash-lite",
      reason: "provider_failure",
      elapsedMs: 13_402,
      retryable: true,
      errorName: "LessonGenerationFailure",
    });
  });

  it("rejects unexpected free-form fields that could leak private data", () => {
    expect(() =>
      generationEventSchema.parse({
        event: "vidlish_generation",
        level: "error",
        jobId: JOB_ID,
        stage: "lesson_generation",
        action: "failed",
        provider: "gemini",
        message: "transcript text or provider response must not enter logs",
      }),
    ).toThrow();
  });

  it("writes one JSON line to the matching log level", () => {
    const sink = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    emitGenerationEvent(
      {
        level: "warning",
        jobId: JOB_ID,
        stage: "workflow_terminalization",
        action: "succeeded",
        provider: "workflow",
        outcome: "terminated",
      },
      sink,
    );

    expect(sink.warn).toHaveBeenCalledTimes(1);
    expect(sink.info).not.toHaveBeenCalled();
    expect(sink.error).not.toHaveBeenCalled();

    const line = sink.warn.mock.calls[0]?.[0];
    expect(typeof line).toBe("string");
    expect(JSON.parse(line as string)).toEqual({
      event: "vidlish_generation",
      level: "warning",
      jobId: JOB_ID,
      stage: "workflow_terminalization",
      action: "succeeded",
      provider: "workflow",
      outcome: "terminated",
    });
  });
});
