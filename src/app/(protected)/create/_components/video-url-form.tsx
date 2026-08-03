"use client";

import { useState } from "react";

import { parseYouTubeUrl, type PlayableVideoMetadata } from "@/modules/video";
import { validateVideoUrlResponseSchema } from "@/shared/contracts/video";
import {
  publicProductErrorSchema,
  type PublicProductError,
} from "@/shared/errors/product-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { VideoMetadataPreview } from "./video-metadata-preview";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; metadata: PlayableVideoMetadata }
  | { status: "error"; error: PublicProductError };

const invalidUrlError: PublicProductError = {
  code: "VIDEO_URL_INVALID",
  messageVi: "Liên kết YouTube không hợp lệ. Hãy kiểm tra và thử lại.",
  retryable: false,
};

const genericMetadataError: PublicProductError = {
  code: "VIDEO_METADATA_FAILED",
  messageVi: "Vidlish chưa thể kiểm tra video. Hãy thử lại.",
  retryable: true,
  action: "retry",
};

async function readPublicError(response: Response): Promise<PublicProductError> {
  try {
    const body = (await response.json()) as unknown;
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return genericMetadataError;
    }
    const parsed = publicProductErrorSchema.safeParse(
      (body as { error: unknown }).error,
    );
    return parsed.success ? parsed.data : genericMetadataError;
  } catch {
    return genericMetadataError;
  }
}

export function VideoUrlForm() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ViewState>({ status: "idle" });

  function validateLocally(): boolean {
    if (!url.trim()) {
      setState({ status: "error", error: invalidUrlError });
      return false;
    }
    try {
      parseYouTubeUrl(url);
      return true;
    } catch {
      setState({ status: "error", error: invalidUrlError });
      return false;
    }
  }

  async function submit() {
    if (!validateLocally()) return;
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/video/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        setState({ status: "error", error: await readPublicError(response) });
        return;
      }

      const raw = (await response.json()) as unknown;
      const parsed = validateVideoUrlResponseSchema.safeParse(raw);
      if (!parsed.success) {
        setState({ status: "error", error: genericMetadataError });
        return;
      }
      setState({ status: "success", metadata: parsed.data.metadata });
    } catch {
      setState({
        status: "error",
        error: {
          ...genericMetadataError,
          messageVi: "Không thể kết nối tới Vidlish. Hãy thử lại.",
        },
      });
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setState({ status: "idle" });
    } catch {
      // Browser permission denial leaves the field editable; no blocking error needed.
    }
  }

  const errorId = state.status === "error" ? "video-url-error" : undefined;

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor="youtube-url" className="block text-sm font-semibold">
            Liên kết video YouTube
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="youtube-url"
              name="youtube-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                if (state.status !== "idle") setState({ status: "idle" });
              }}
              onBlur={() => {
                if (url.trim()) validateLocally();
              }}
              aria-describedby={errorId ?? "video-url-help"}
              aria-invalid={state.status === "error"}
              disabled={state.status === "loading"}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => void pasteFromClipboard()}
              disabled={state.status === "loading"}
            >
              Dán
            </Button>
          </div>
          <p id="video-url-help" className="text-sm text-[var(--muted-foreground)]">
            Hỗ trợ link xem video, youtu.be, Shorts và embed.
          </p>
        </div>

        {state.status === "error" ? (
          <div className="space-y-3">
            <p id="video-url-error" role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
              {state.error.messageVi}
            </p>
            {state.error.retryable ? (
              <Button type="button" variant="secondary" onClick={() => void submit()}>
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Đang kiểm tra…" : "Kiểm tra video"}
        </Button>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {state.status === "loading" ? (
          <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">Đang lấy thông tin video…</p>
          </div>
        ) : null}
        {state.status === "success" ? (
          <VideoMetadataPreview metadata={state.metadata} />
        ) : null}
      </div>
    </div>
  );
}
