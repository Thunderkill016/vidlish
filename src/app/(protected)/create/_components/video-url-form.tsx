"use client";

import { startTransition, useEffect, useState } from "react";
import { z } from "zod";

import { parseYouTubeUrl, type PlayableVideoMetadata } from "@/modules/video";
import {
  createLessonJobResponseSchema,
} from "@/shared/contracts/generation";
import {
  confirmedLessonDraftSchema,
  type CefrLevel,
  type ConfirmedLessonDraft,
} from "@/shared/contracts/lesson-draft";
import {
  playableVideoMetadataSchema,
  validateVideoUrlResponseSchema,
} from "@/shared/contracts/video";
import {
  publicProductErrorSchema,
  type PublicProductError,
} from "@/shared/errors/product-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { CefrSelector } from "./cefr-selector";
import { VideoMetadataPreview } from "./video-metadata-preview";

type ViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; metadata: PlayableVideoMetadata }
  | { status: "error"; error: PublicProductError };

const DRAFT_STORAGE_KEY = "vidlish:create-draft:v1";

/** Re-validated on read: sessionStorage is user-writable. */
const savedDraftSchema = z.object({
  url: z.string(),
  metadata: playableVideoMetadataSchema,
  confirmedDraft: confirmedLessonDraftSchema,
});

type JobState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: PublicProductError };

const invalidUrlError: PublicProductError = {
  code: "VIDEO_URL_INVALID",
  messageVi: "Liên kết YouTube không hợp lệ. Hãy kiểm tra và thử lại.",
  retryable: false,
};

const genericMetadataError: PublicProductError = {
  code: "VIDEO_METADATA_FAILED",
  messageVi: "Nếp chưa thể kiểm tra video. Hãy thử lại.",
  retryable: true,
  action: "retry",
};

const genericJobError: PublicProductError = {
  code: "JOB_CREATE_FAILED",
  messageVi: "Nếp chưa thể bắt đầu tạo bài học. Hãy thử lại.",
  retryable: true,
  action: "retry",
};

async function readPublicError(
  response: Response,
  fallback: PublicProductError,
): Promise<PublicProductError> {
  try {
    const body = (await response.json()) as unknown;
    if (typeof body !== "object" || body === null || !("error" in body)) {
      return fallback;
    }
    const parsed = publicProductErrorSchema.safeParse(
      (body as { error: unknown }).error,
    );
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export function VideoUrlForm() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ViewState>({ status: "idle" });
  const [cefrLevel, setCefrLevel] = useState<CefrLevel>();
  const [confirmedDraft, setConfirmedDraft] =
    useState<ConfirmedLessonDraft>();
  const [jobState, setJobState] = useState<JobState>({ status: "idle" });

  // The card below tells the learner their video and level are confirmed "trong
  // phiên này". A reload is still the same session, so losing the confirmation
  // there breaks a promise the page makes out loud — and it costs the learner
  // the video lookup as well. Only a public video id, a CEFR level and the
  // metadata already shown on screen are stored; nothing private.
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (!saved) return;
      const parsed = savedDraftSchema.safeParse(JSON.parse(saved));
      if (!parsed.success) {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      // One transition, so restoring four pieces of state is a single render
      // rather than a cascade.
      startTransition(() => {
        setUrl(parsed.data.url);
        setState({ status: "success", metadata: parsed.data.metadata });
        setCefrLevel(parsed.data.confirmedDraft.cefrLevel);
        setConfirmedDraft(parsed.data.confirmedDraft);
      });
    } catch {
      // A corrupt or unavailable store must never keep the page from loading.
    }
  }, []);

  useEffect(() => {
    try {
      if (confirmedDraft && state.status === "success") {
        window.sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ url, metadata: state.metadata, confirmedDraft }),
        );
      } else {
        window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } catch {
      // Private browsing can refuse storage; the form still works without it.
    }
  }, [confirmedDraft, state, url]);

  function invalidateReadiness() {
    setConfirmedDraft(undefined);
    setJobState({ status: "idle" });
  }

  function validateLocally(): boolean {
    if (!url.trim()) {
      setState({ status: "error", error: invalidUrlError });
      invalidateReadiness();
      return false;
    }
    try {
      parseYouTubeUrl(url);
      return true;
    } catch {
      setState({ status: "error", error: invalidUrlError });
      invalidateReadiness();
      return false;
    }
  }

  async function submit() {
    if (!validateLocally()) return;
    invalidateReadiness();
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/video/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        setState({
          status: "error",
          error: await readPublicError(response, genericMetadataError),
        });
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
          messageVi: "Không thể kết nối tới Nếp. Hãy thử lại.",
        },
      });
    }
  }

  function confirmSelection() {
    if (state.status !== "success" || !cefrLevel) return;
    const parsed = confirmedLessonDraftSchema.safeParse({
      videoId: state.metadata.videoId,
      cefrLevel,
      metadataVersion: state.metadata.metadataVersion,
    });
    if (!parsed.success) {
      invalidateReadiness();
      return;
    }
    setConfirmedDraft(parsed.data);
    setJobState({ status: "idle" });
  }

  async function createJob() {
    if (!confirmedDraft || jobState.status === "loading") return;
    setJobState({ status: "loading" });
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmedDraft),
      });
      if (!response.ok) {
        setJobState({
          status: "error",
          error: await readPublicError(response, genericJobError),
        });
        return;
      }
      const payload = createLessonJobResponseSchema.safeParse(
        (await response.json()) as unknown,
      );
      if (!payload.success) {
        setJobState({ status: "error", error: genericJobError });
        return;
      }
      window.location.assign(`/jobs/${payload.data.jobId}`);
    } catch {
      setJobState({ status: "error", error: genericJobError });
    }
  }

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setState({ status: "idle" });
      invalidateReadiness();
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
                invalidateReadiness();
              }}
              onBlur={() => {
                if (url.trim()) validateLocally();
              }}
              aria-describedby={errorId ?? "video-url-help"}
              aria-invalid={state.status === "error"}
              disabled={state.status === "loading" || jobState.status === "loading"}
            />
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              onClick={() => void pasteFromClipboard()}
              disabled={state.status === "loading" || jobState.status === "loading"}
            >
              Dán
            </Button>
          </div>
          <p id="video-url-help" className="text-sm text-[var(--muted-foreground)]">
            Hỗ trợ link xem video, link ngắn youtu.be, Shorts và link nhúng.
          </p>
        </div>

        {state.status === "error" ? (
          <div className="space-y-3">
            <p
              id="video-url-error"
              role="alert"
              className="text-sm font-medium text-red-700 dark:text-red-300"
            >
              {state.error.messageVi}
            </p>
            {state.error.retryable ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void submit()}
              >
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={state.status === "loading" || jobState.status === "loading"}
        >
          {state.status === "loading" ? "Đang kiểm tra…" : "Kiểm tra video"}
        </Button>
      </form>

      <div aria-live="polite" aria-atomic="true">
        {state.status === "loading" ? (
          <div className="animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">
              Đang lấy thông tin video…
            </p>
          </div>
        ) : null}
      </div>

      {state.status === "success" ? (
        <div className="space-y-6">
          <VideoMetadataPreview metadata={state.metadata} />
          <CefrSelector
            value={cefrLevel}
            onChange={(level) => {
              setCefrLevel(level);
              invalidateReadiness();
            }}
          />

          <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
            <p
              id="readiness-help"
              className="text-sm text-[var(--muted-foreground)]"
            >
              {cefrLevel
                ? `Nếp đã kiểm tra video và bạn đã chọn mức ${cefrLevel}.`
                : "Chọn một mức để xác nhận lựa chọn."}
            </p>
            <Button
              type="button"
              disabled={!cefrLevel || jobState.status === "loading"}
              aria-describedby="readiness-help"
              onClick={confirmSelection}
            >
              Xác nhận lựa chọn
            </Button>
          </div>
        </div>
      ) : null}

      <div aria-live="polite" aria-atomic="true">
        {confirmedDraft ? (
          <section
            data-testid="confirmed-lesson-draft"
            className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5"
          >
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Sẵn sàng tạo bài học</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Video và mức {confirmedDraft.cefrLevel} đã được xác nhận trong phiên này.
              </p>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Nếp không lưu video. Video vẫn cần đủ lời nói tiếng Anh gốc; không phải mọi video công khai đều tạo được bài học.
            </p>
            {jobState.status === "error" ? (
              <p id="job-create-error" role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
                {jobState.error.messageVi}
              </p>
            ) : null}
            <Button
              type="button"
              disabled={jobState.status === "loading"}
              aria-describedby={jobState.status === "error" ? "job-create-error" : undefined}
              onClick={() => void createJob()}
            >
              {jobState.status === "loading" ? "Đang bắt đầu…" : "Tạo bài học"}
            </Button>
          </section>
        ) : null}
      </div>
    </div>
  );
}
