"use client";

import { useEffect, useRef, useState } from "react";

import {
  learningSpeakingAttemptResponseSchema,
  type LearningSpeakingAttempt,
} from "@/shared/contracts/learning-speaking";
import {
  checkOnDeviceEnglishDictation,
  installOnDeviceEnglishDictation,
  startOnDeviceSpeechProbe,
  type OnDeviceSpeechAvailability,
  type OnDeviceSpeechProbeController,
  type OnDeviceSpeechProbeResult,
} from "@/platform/speech/on-device-speech-probe";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
] as const;

type LocalProbeStatus =
  | "idle"
  | "listening"
  | "detected"
  | "not_detected"
  | "failed";

function preferredMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));
}

export function SpeakingCapturePanel({
  sessionId,
  activityId,
  exemplarAfterAttempt,
  recognitionTargetPhrases,
}: {
  sessionId: string;
  activityId: string;
  exemplarAfterAttempt?: string;
  recognitionTargetPhrases: readonly string[];
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const idempotencyRef = useRef<string>(crypto.randomUUID());
  const localProbeRef = useRef<OnDeviceSpeechProbeController | null>(null);

  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [replayed, setReplayed] = useState(false);
  const [confirmedAudibleSpeech, setConfirmedAudibleSpeech] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedAttempt, setSavedAttempt] = useState<LearningSpeakingAttempt | null>(
    null,
  );
  const [supportRevealed, setSupportRevealed] = useState(false);
  const [error, setError] = useState("");
  const [localAvailability, setLocalAvailability] = useState<
    OnDeviceSpeechAvailability | "checking"
  >("checking");
  const [installingLocalPack, setInstallingLocalPack] = useState(false);
  const [localProbeStatus, setLocalProbeStatus] =
    useState<LocalProbeStatus>("idle");
  const [localProbeResult, setLocalProbeResult] =
    useState<OnDeviceSpeechProbeResult | null>(null);

  useEffect(() => {
    let active = true;
    void checkOnDeviceEnglishDictation().then((availability) => {
      if (active) setLocalAvailability(availability);
    });
    return () => {
      active = false;
      localProbeRef.current?.abort();
      localProbeRef.current = null;
    };
  }, []);

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
    setSavedAttempt(null);
    idempotencyRef.current = crypto.randomUUID();
  }

  async function installLocalRecognition() {
    if (installingLocalPack) return;
    setInstallingLocalPack(true);
    try {
      await installOnDeviceEnglishDictation();
      setLocalAvailability(await checkOnDeviceEnglishDictation());
    } finally {
      setInstallingLocalPack(false);
    }
  }

  async function startRecording() {
    if (recording || uploading) return;
    setError("");
    setSaved(false);
    setSavedAttempt(null);
    localProbeRef.current?.abort();
    localProbeRef.current = null;
    setLocalProbeResult(null);
    setLocalProbeStatus("idle");

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

      const audioTrack = stream.getAudioTracks()[0];
      if (
        localAvailability === "available" &&
        audioTrack &&
        recognitionTargetPhrases.length > 0
      ) {
        setLocalProbeStatus("listening");
        localProbeRef.current = startOnDeviceSpeechProbe({
          audioTrack,
          targetPhrases: recognitionTargetPhrases,
          onResult(result) {
            setLocalProbeResult(result);
            setLocalProbeStatus(
              result.targetPhraseDetected ? "detected" : "not_detected",
            );
          },
          onError() {
            setLocalProbeStatus("failed");
          },
        });
        if (!localProbeRef.current) setLocalProbeStatus("failed");
      }

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        localProbeRef.current?.stop();
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
      localProbeRef.current?.abort();
      localProbeRef.current = null;
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
        throw new Error("Nếp chưa lưu được biên nhận lần nói này.");
      }
      const parsed = learningSpeakingAttemptResponseSchema.parse(body);
      setSavedAttempt(parsed.attempt);
      setSaved(true);
      setSupportRevealed(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Nếp chưa lưu được biên nhận lần nói này.",
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
        <h2 className="text-xl font-bold">Nói trước, xem mẫu sau</h2>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Thu ít nhất một câu, nghe lại hết bản thu rồi tự xác nhận. Nếu đây là
          lần speaking đầu tiên của tình huống sau ít nhất 24 giờ, server có thể
          ghi là bạn tự làm. Nhưng "tự làm" ở đây vẫn là bạn TỰ ĐÁNH GIÁ, chưa
          ai chấm — không phải điểm phát âm, càng không phải đã thạo. Tiếng nói chỉ nằm trong
          browser và request speaking hiện tại; local probe nếu được hỗ trợ chỉ
          đọc cùng live track trên thiết bị. Supabase không lưu audio hay transcript.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <div>
          <p className="text-sm font-semibold">Nhận dạng cục bộ · thử nghiệm</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Chỉ bật khi trình duyệt xác nhận nó nhận dạng tiếng Anh ngay trên máy
            bạn. Nếp không chuyển sang máy chủ ngoài. Chữ máy nghe được không được
            hiển thị, gửi API hay lưu; probe chỉ giữ một kết quả bounded trong RAM.
          </p>
        </div>

        {localAvailability === "checking" ? (
          <p className="text-sm">Đang kiểm tra khả năng nhận dạng trên thiết bị…</p>
        ) : null}
        {localAvailability === "unsupported" ||
        localAvailability === "unavailable" ? (
          <p className="text-sm">
            Trình duyệt này chưa nhận dạng được tiếng Anh ngay trên máy. Bạn vẫn
            nói và tự đánh giá được; Nếp không gửi tiếng nói ra dịch vụ ngoài.
          </p>
        ) : null}
        {localAvailability === "downloadable" ? (
          <button
            type="button"
            onClick={installLocalRecognition}
            disabled={installingLocalPack}
            className="min-h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {installingLocalPack
              ? "Đang cài gói English trên thiết bị…"
              : "Cài gói nhận dạng English trên thiết bị"}
          </button>
        ) : null}
        {localAvailability === "downloading" ? (
          <p className="text-sm">Browser đang tải gói nhận dạng English cục bộ.</p>
        ) : null}
        {localAvailability === "available" ? (
          <p className="text-sm font-semibold">
            Máy đã sẵn sàng nhận dạng tiếng Anh ngay trên máy bạn cho lần nói tới.
          </p>
        ) : null}
        {localProbeStatus === "listening" ? (
          <p role="status" className="text-sm">
            Probe ASR đang nghe cùng audio track trên thiết bị…
          </p>
        ) : null}
        {localProbeStatus === "detected" && localProbeResult ? (
          <p role="status" className="text-sm font-semibold">
            ASR trên thiết bị nhận ra target phrase trong khoảng {" "}
            {localProbeResult.recognizedWordCount} từ. Đây chỉ là diagnostic local,
            không được cộng vào progress hay coi là pronunciation success.
          </p>
        ) : null}
        {localProbeStatus === "not_detected" && localProbeResult ? (
          <p role="status" className="text-sm">
            ASR trên thiết bị nhận ra khoảng {localProbeResult.recognizedWordCount} từ
            nhưng chưa thấy target phrase. Nếp không coi kết quả thử nghiệm này
            là speaking failure.
          </p>
        ) : null}
        {localProbeStatus === "failed" ? (
          <p role="status" className="text-sm">
            Lần này máy không nhận dạng được. Nếp không gửi ra dịch vụ ngoài để
            bù; phần bạn tự đánh giá vẫn được giữ như cũ.
          </p>
        ) : null}
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
            một lượt trước khi lưu phần bạn tự đánh giá.
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
              ? "Đã lưu phần bạn tự đánh giá"
              : uploading
                ? "Đang lưu biên nhận…"
                : "Lưu phần tự đánh giá"}
          </button>
        </div>
      ) : null}

      {savedAttempt ? (
        <p role="status" className="text-sm font-semibold">
          Đã ghi lần nói thứ {savedAttempt.attemptNumber}, phần bạn tự đánh giá: {" "}
          {savedAttempt.support === "independent"
            ? "independent sau trì hoãn"
            : "supported"}
          . Kết quả vẫn unscored — không phải điểm phát âm, intelligibility hay
          mastery.
        </p>
      ) : null}

      {supportRevealed && exemplarAfterAttempt ? (
        <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <p className="text-sm font-semibold">Mẫu chỉ mở sau lần nói</p>
          <p>{exemplarAfterAttempt}</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Có thể bấm “Thu lại” để retry. Mọi retry sau khi mẫu đã mở được ghi
            supported, kể cả khi không nhìn lại mẫu.
          </p>
        </div>
      ) : null}

      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
