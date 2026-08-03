// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JobProgress } from "@/app/(protected)/jobs/[jobId]/_components/job-progress";
import type { PublicGenerationJob } from "@/shared/contracts/generation";

const job: PublicGenerationJob = {
  id: "11111111-1111-4111-8111-111111111111",
  videoId: "dQw4w9WgXcQ",
  videoTitle: "How to build a better learning habit",
  channelName: "Vidlish Test Channel",
  durationMs: 933000,
  cefrLevel: "B1",
  metadataVersion: "fixture:v1",
  pipelineVersion: "generation-pipeline:v1",
  status: "acquiring_transcript",
  currentStage: "acquiring_transcript",
  dispatchStatus: "sent",
  createdAt: "2026-08-03T19:00:00.000Z",
  updatedAt: "2026-08-03T19:00:01.000Z",
};

afterEach(() => vi.unstubAllGlobals());

describe("JobProgress", () => {
  it("renders the persisted phase and polls the owner-scoped endpoint", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ job, phase: "transcript" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      createElement(JobProgress, {
        initialJob: job,
        initialPhase: "transcript",
      }),
    );

    expect(screen.getByRole("heading", { name: "Tiến trình" })).toBeVisible();
    expect(screen.getAllByText("Lấy hoặc tạo transcript").length).toBeGreaterThan(0);
    expect(screen.getByText("How to build a better learning habit")).toBeVisible();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/jobs/${job.id}`,
        { cache: "no-store" },
      ),
    );
  });

  it("does not poll a terminal job", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      createElement(JobProgress, {
        initialJob: { ...job, status: "completed" },
        initialPhase: "completed",
      }),
    );

    expect(screen.getByText("Bài học đã sẵn sàng")).toBeVisible();
    await Promise.resolve();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
