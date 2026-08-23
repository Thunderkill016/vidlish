"use client";

import { useEffect, useRef, useState } from "react";

import { learningSpeakingAttemptResponseSchema } from "@/shared/contracts/learning-speaking";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function SpeakingCapturePanel({
  sessionId,
  activityId,
}: {
  sessionId: string;
  activityId: string;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const idempotencyRef = useRef<string>(crypto.randomUUID());

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [replayed, setReplayed] = useState(false);
  const [confirmedAudibleSpeech, setConfirmedAudibleSpeech] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function replaceRecording(blob: Blob, nextDurationMs: number) {
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(blob);
    });
    setAudioBlob(blob);
    setDurationMs(nextDurationMs);
    setReplayed(false);
    setConfirmedAudibleSpeech(false);
    setSaved(false);
    idempotencyRef.current = crypto.randomUUID();
  }

  async function startRecording() {
    if (recording || uploading) return;
    setError("");
    setSaved(false);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Trình duyệt này chưa hỗ trợ thu âm microphone cho bài nói.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = preferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      startedAtRef.current = performance.now();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const elapsed = Math.round(
          performance.now() - (startedAtRef.current ?? performance.now()),
        );
        const blobType =
          recorder.mimeType || chunksRef.current[0]?.type || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        setRecording(false);
        if (elapsed < 500 || blob.size < 256) {
          setError("Bản thu quá ngắn để lưu. Hãy nói lại ít nhất một câu.");
          return;
        }
        replaceRecording(blob, elapsed);
      });
      recorder.start();
      setRecording(true);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setError("Không mở được microphone. Kiểm tra quyền microphone rồi thử lại.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
  }

  async function saveAttempt() {
    if (
      !audioBlob ||
      !replayed ||
      !confirmedAudibleSpeech ||
      uploading ||
      saved
    ) {
      return;
    }

    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.set("sessionId", sessionId);
      form.set("activityId", activityId);
      form.set("idempotencyKey", idempotencyRef.current);
      form.set("durationMs", String(durationMs));
      form.set("replayed", "true");
      form.set("confirmedAudibleSpeech", "true");
      form.set("audio", audioBlob, "vidlish-speaking-capture");

      const request = await fetch("/api/learning-lab/v2/speaking-attempts", {
        method: "POST",
        body: form,
      });
      const body = (await request.json()) as unknown;
      if (!request.ok) {
        throw new Error("Vidlish chưa thể lưu speaking receipt.");
      }
      learningSpeakingAttemptResponseSchema.parse(body);
      setSaved(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Vidlish chưa thể lưu speaking receipt.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">
          Speaking capture · self-check
        </p>
        <h2 className="text-xl font-bold">Nói lại bằng chính giọng của bạn</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Thu ít nhất một câu, nghe lại hết bản thu rồi tự xác nhận. Vidlish không
          chấm phát âm ở bước này. Audio chỉ đi qua request hiện tại để xác nhận
          có bản thu; Supabase chỉ lưu metadata receipt, không lưu audio hay transcript.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startRecording}
          disabled={recording || uploading}
          className="min-h-11 rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {audioBlob ? "Thu lại" : "Bắt đầu thu âm"}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={!recording}
          className="min-h-11 rounded-xl border border-[var(--border)] px-4 py-2 font-semibold disabled:opacity-50"
        >
          Dừng thu
        </button>
        {recording ? (
          <p role="status" className="self-center text-sm font-semibold">
            Đang thu âm…
          </p>
        ) : null}
      </div>

      {audioUrl ? (
        <div className="space-y-3">
          <audio
            controls
            src={audioUrl}
            onEnded={() => setReplayed(true)}
            className="w-full"
          >
            Trình duyệt không phát được bản thu này.
          </audio>
          <p className="text-sm text-[var(--muted-foreground)]">
            Bản thu khoảng {(durationMs / 1000).toFixed(1)} giây. Phải nghe hết
            một lượt trước khi lưu self-check.
          </p>
        </div>
      ) : null}

      {audioBlob ? (
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={replayed} readOnly className="mt-1" />
            <span>Tôi đã nghe hết bản thu trên thiết bị này.</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={confirmedAudibleSpeech}
              onChange={(event) =>
                setConfirmedAudibleSpeech(event.target.checked)
              }
              className="mt-1"
            />
            <span>
              Tôi nghe rõ ít nhất một câu tiếng Anh do chính mình vừa nói.
            </span>
          </label>
          <button
            type="button"
            onClick={saveAttempt}
            disabled={
              !replayed || !confirmedAudibleSpeech || uploading || saved
            }
            className="min-h-11 w-full rounded-xl bg-[var(--primary)] px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            {saved
              ? "Đã lưu speaking self-check"
              : uploading
                ? "Đang lưu receipt…"
                : "Lưu speaking self-check"}
          </button>
        </div>
      ) : null}

      {saved ? (
        <p role="status" className="text-sm font-semibold">
          Đã ghi nhận một speaking self-check chưa chấm. Đây không phải điểm phát
          âm, intelligibility hay mastery.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
