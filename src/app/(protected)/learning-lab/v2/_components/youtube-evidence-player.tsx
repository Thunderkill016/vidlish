"use client";

import { useEffect, useRef, useState } from "react";

import type { EvidenceRef } from "@/shared/contracts/lesson-v2";

type YouTubePlayer = {
  cueVideoById(input: {
    videoId: string;
    startSeconds: number;
    endSeconds: number;
  }): void;
  loadVideoById(input: {
    videoId: string;
    startSeconds: number;
    endSeconds: number;
  }): void;
  pauseVideo(): void;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
};

type YouTubePlayerEvent = {
  target: YouTubePlayer;
  data?: number;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      width: string | number;
      height: string | number;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady(event: YouTubePlayerEvent): void;
        onStateChange(event: YouTubePlayerEvent): void;
        onError(event: YouTubePlayerEvent): void;
        onAutoplayBlocked(): void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YouTubeApi> | undefined;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error("YouTube IFrame API loaded without Player."));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.append(script);
    }
    script.addEventListener(
      "error",
      () => reject(new Error("YouTube IFrame API could not be loaded.")),
      { once: true },
    );
  });

  return youtubeApiPromise;
}

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function playerErrorMessage(code: number | undefined): string {
  switch (code) {
    case 2:
      return "Video ID không hợp lệ.";
    case 5:
      return "Trình duyệt không phát được video HTML5 này.";
    case 100:
      return "Video không còn tồn tại hoặc đang riêng tư.";
    case 101:
    case 150:
      return "Chủ video không cho phép phát video này trong Vidlish.";
    case 153:
      return "YouTube từ chối request vì thiếu thông tin nhận diện nguồn phát.";
    default:
      return "YouTube chưa thể phát đoạn nguồn này.";
  }
}

export function YouTubeEvidencePlayer({
  videoId,
  videoTitle,
  evidence,
  captionControlAllowed,
  onPlay,
}: {
  videoId: string;
  videoTitle: string;
  evidence: EvidenceRef;
  captionControlAllowed: boolean;
  onPlay?: () => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [captionsShown, setCaptionsShown] = useState(
    evidence.captionPolicy === "shown",
  );
  const [status, setStatus] = useState("Đang tải trình phát YouTube…");

  const startSeconds = evidence.startMs / 1000;
  const endSeconds = evidence.endMs / 1000;
  const nativeControlsVisible =
    evidence.captionPolicy === "shown" || captionControlAllowed;

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    let disposed = false;
    let localPlayer: YouTubePlayer | null = null;
    shell.replaceChildren();
    const host = document.createElement("div");
    shell.append(host);

    void loadYouTubeApi()
      .then((api) => {
        if (disposed) return;
        localPlayer = new api.Player(host, {
          width: "100%",
          height: "100%",
          videoId,
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            controls: nativeControlsVisible ? 1 : 0,
            playsinline: 1,
            rel: 0,
            cc_load_policy: captionsShown ? 1 : 0,
            cc_lang_pref: "en",
          },
          events: {
            onReady: (event) => {
              if (disposed) return;
              playerRef.current = event.target;
              event.target.getIframe().title =
                `${videoTitle} — đoạn ${formatTime(evidence.startMs)} đến ${formatTime(evidence.endMs)}`;
              event.target.cueVideoById({
                videoId,
                startSeconds,
                endSeconds,
              });
              setReady(true);
              setStatus("Đoạn nguồn đã sẵn sàng.");
            },
            onStateChange: (event) => {
              if (disposed) return;
              if (event.data === api.PlayerState.PLAYING) {
                setStatus(
                  `Đang phát đoạn ${formatTime(evidence.startMs)}–${formatTime(evidence.endMs)}.`,
                );
              } else if (event.data === api.PlayerState.PAUSED) {
                setStatus("Đã tạm dừng đoạn nguồn.");
              } else if (event.data === api.PlayerState.ENDED) {
                setStatus("Đã phát xong đoạn nguồn.");
              }
            },
            onError: (event) => {
              if (disposed) return;
              setReady(false);
              setStatus(playerErrorMessage(event.data));
            },
            onAutoplayBlocked: () => {
              if (disposed) return;
              setStatus("Trình duyệt đã chặn phát tự động. Hãy nhấn Phát đoạn.");
            },
          },
        });
      })
      .catch(() => {
        if (disposed) return;
        setReady(false);
        setStatus("Không tải được YouTube IFrame API.");
      });

    return () => {
      disposed = true;
      if (playerRef.current === localPlayer) playerRef.current = null;
      localPlayer?.destroy();
      shell.replaceChildren();
    };
  }, [
    captionsShown,
    endSeconds,
    evidence.endMs,
    evidence.startMs,
    nativeControlsVisible,
    startSeconds,
    videoId,
    videoTitle,
  ]);

  function playClip() {
    if (!playerRef.current || !ready) {
      setStatus("Trình phát chưa sẵn sàng.");
      return;
    }
    playerRef.current.loadVideoById({
      videoId,
      startSeconds,
      endSeconds,
    });
    onPlay?.();
    setStatus(
      `Đang phát đoạn ${formatTime(evidence.startMs)}–${formatTime(evidence.endMs)}.`,
    );
  }

  function pauseClip() {
    playerRef.current?.pauseVideo();
    setStatus("Đã tạm dừng đoạn nguồn.");
  }

  function toggleCaptions() {
    setReady(false);
    setStatus(
      captionsShown
        ? "Đang tải lại đoạn với phụ đề tắt…"
        : "Đang tải lại đoạn với phụ đề tiếng Anh…",
    );
    setCaptionsShown((current) => !current);
  }

  return (
    <section className="space-y-3" aria-label="Trình phát đoạn nguồn">
      <div className="aspect-video overflow-hidden rounded-xl bg-black">
        <div ref={shellRef} className="size-full" data-testid="youtube-player" />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={playClip}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
        >
          Phát đoạn
        </button>
        <button
          type="button"
          onClick={pauseClip}
          className="min-h-11 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)]"
        >
          Tạm dừng
        </button>
        {captionControlAllowed ? (
          <button
            type="button"
            onClick={toggleCaptions}
            className="col-span-2 min-h-11 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--background)] sm:col-span-1"
          >
            {captionsShown ? "Tắt phụ đề" : "Bật phụ đề"}
          </button>
        ) : null}
      </div>

      {!captionControlAllowed && evidence.captionPolicy !== "shown" ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Lượt nghe đầu ẩn phụ đề và native controls. Phụ đề chỉ mở theo support ladder.
        </p>
      ) : null}

      <p className="text-sm" aria-live="polite">
        {status}
      </p>
      <a
        href={`https://www.youtube.com/watch?v=${videoId}&t=${Math.floor(startSeconds)}s`}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-block text-xs text-[var(--accent)] underline"
      >
        Mở video nguồn tại {formatTime(evidence.startMs)}
      </a>
    </section>
  );
}
