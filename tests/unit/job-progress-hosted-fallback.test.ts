// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JobProgress } from "@/app/(protected)/jobs/[jobId]/_components/job-progress";
import type { PublicGenerationJob } from "@/shared/contracts/generation";

const baseJob: PublicGenerationJob = {
  id: "11111111-1111-4111-8111-111111111111",
  videoId: "nocaption01",
  videoTitle: "No caption fixture",
  channelName: "Fixture channel",
  durationMs: 900_000,
  cefrLevel: "B1",
  metadataVersion: "fixture:v1",
  pipelineVersion: "generation-pipeline:v1",
  status: "acquiring_transcript",
  currentStage: "trying_transcript_fallback",
  dispatchStatus: "sent",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:01.000Z",
};

function response(job: PublicGenerationJob) {
  return new Response(JSON.stringify({ job, phase: "transcript" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("JobProgress hosted transcript copy", () => {
  it("shows one provider-neutral message while trying the fallback", () => {
    vi.stubGlobal("fetch", vi.fn(async () => response(baseJob)));
    render(
      createElement(JobProgress, {
        initialJob: baseJob,
        initialPhase: "transcript",
      }),
    );

    expect(
      screen.getByText("Vidlish đang thử cách khác để lấy lời thoại"),
    ).toBeVisible();
    expect(screen.getByText(/Tiến trình đã được lưu/)).toBeVisible();
    expect(screen.queryByText(/Supadata|provider_job|metered/i)).not.toBeInTheDocument();
  });

  it("keeps exhausted automatic acquisition at the transcript boundary", () => {
    const unavailable = {
      ...baseJob,
      currentStage: "automatic_transcript_unavailable",
    };
    vi.stubGlobal("fetch", vi.fn(async () => response(unavailable)));
    render(
      createElement(JobProgress, {
        initialJob: unavailable,
        initialPhase: "transcript",
      }),
    );

    expect(screen.getByText("Chưa lấy được lời thoại tự động")).toBeVisible();
    expect(screen.getByText(/các phương án lấy transcript tiếp theo/)).toBeVisible();
  });
});
