// @vitest-environment jsdom

import { createElement } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { VideoUrlForm } from "@/app/(protected)/create/_components/video-url-form";

const metadata = {
  videoId: "dQw4w9WgXcQ",
  metadataVersion: "fixture:v1",
  availability: "playable" as const,
  title: "How to build a better learning habit",
  channelName: "Vidlish Test Channel",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  durationMs: 933000,
};

afterEach(() => vi.unstubAllGlobals());

describe("VideoUrlForm", () => {
  it("rejects invalid URL before network call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(createElement(VideoUrlForm));

    await user.type(screen.getByLabelText("Liên kết video YouTube"), "https://evil.example");
    await user.click(screen.getByRole("button", { name: "Kiểm tra video" }));

    expect(screen.getByRole("alert")).toHaveTextContent("không hợp lệ");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders metadata and clears stale preview after URL edit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ metadata }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    const user = userEvent.setup();
    render(createElement(VideoUrlForm));

    const input = screen.getByLabelText("Liên kết video YouTube");
    await user.type(input, "https://youtu.be/dQw4w9WgXcQ");
    await user.click(screen.getByRole("button", { name: "Kiểm tra video" }));

    expect(await screen.findByTestId("video-metadata-preview")).toHaveTextContent(
      "How to build a better learning habit",
    );
    await user.type(input, "x");
    await waitFor(() =>
      expect(screen.queryByTestId("video-metadata-preview")).not.toBeInTheDocument(),
    );
  });

  it("shows retry only for retryable provider failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: {
              code: "VIDEO_METADATA_FAILED",
              messageVi: "Vidlish chưa thể kiểm tra video. Hãy thử lại.",
              retryable: true,
              action: "retry",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const user = userEvent.setup();
    render(createElement(VideoUrlForm));
    await user.type(
      screen.getByLabelText("Liên kết video YouTube"),
      "https://youtu.be/retryfail01",
    );
    await user.click(screen.getByRole("button", { name: "Kiểm tra video" }));
    expect(await screen.findByRole("button", { name: "Thử lại" })).toBeVisible();
  });

  it("fails closed when the internal success payload violates its schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            metadata: {
              videoId: "dQw4w9WgXcQ",
              metadataVersion: "broken",
              availability: "playable",
              title: "Missing channel",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const user = userEvent.setup();
    render(createElement(VideoUrlForm));
    await user.type(
      screen.getByLabelText("Liên kết video YouTube"),
      "https://youtu.be/dQw4w9WgXcQ",
    );
    await user.click(screen.getByRole("button", { name: "Kiểm tra video" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "chưa thể kiểm tra video",
    );
    expect(screen.queryByTestId("video-metadata-preview")).not.toBeInTheDocument();
  });
