import type { SpeechEnvelope } from "@/modules/shadowing/application/score-shadowing-rhythm";

/**
 * Turns sound into the loudness-over-time curve the rhythm scorer compares.
 *
 * Two sources, one shape. The learner's voice comes from the microphone; the
 * model comes from the curriculum recording, decoded rather than played, so the
 * reference is identical every time and does not depend on the room, the
 * speakers, or whether the learner turned the volume down.
 *
 * This is deliberately not a recording. No audio is kept, uploaded, or
 * reconstructable: the microphone stream is reduced to one number per frame as
 * it arrives and the stream is closed the moment the stage ends. What survives
 * is a curve of how loud the learner was, which is what rhythm is made of and
 * is not speech anyone could listen back to.
 */

/**
 * One frame per 10 ms. The conventional analysis window for speech envelopes:
 * fast enough to resolve individual syllables — English runs roughly 4–7 a
 * second — and slow enough that the curve is syllable rhythm rather than the
 * waveform itself.
 */
const FRAME_RATE = 100;
const FRAME_INTERVAL_MS = 1000 / FRAME_RATE;

/**
 * Analyser window. 1024 samples is ~21 ms at 48 kHz — a little over one frame,
 * so consecutive frames overlap slightly and the curve comes out smooth instead
 * of jittering on window boundaries.
 */
const FFT_SIZE = 1024;

/** Longer than any curriculum line, and a hard stop if a stage is abandoned. */
const MAX_CAPTURE_SECONDS = 30;

export type EnvelopeCapture = {
  /** Ends capture, releases the microphone, and returns what was measured. */
  stop(): SpeechEnvelope;
};

/**
 * Starts measuring the learner's loudness.
 *
 * Returns null when there is no microphone or the learner declined it. The
 * caller must then refuse to score rather than substituting anything: a
 * shadowing stage with no voice in it has no result, and saying otherwise is
 * the failure mode this product is built against.
 */
export async function captureSpeechEnvelope(): Promise<EnvelopeCapture | null> {
  if (typeof window === "undefined") return null;
  const media = navigator.mediaDevices;
  if (!media?.getUserMedia) return null;

  let stream: MediaStream;
  try {
    stream = await media.getUserMedia({ audio: true });
  } catch {
    // Denied, or no device. Both mean the same thing to the caller.
    return null;
  }

  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) {
    for (const track of stream.getTracks()) track.stop();
    return null;
  }

  const context = new AudioContextClass();
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  const buffer = new Float32Array(analyser.fftSize);
  const frames: number[] = [];

  const timer = window.setInterval(() => {
    if (frames.length >= MAX_CAPTURE_SECONDS * FRAME_RATE) return;
    analyser.getFloatTimeDomainData(buffer);
    frames.push(rootMeanSquare(buffer));
  }, FRAME_INTERVAL_MS);

  let stopped = false;
  return {
    stop() {
      if (!stopped) {
        stopped = true;
        window.clearInterval(timer);
        source.disconnect();
        for (const track of stream.getTracks()) track.stop();
        void context.close();
      }
      return { frames: [...frames], frameRate: FRAME_RATE };
    },
  };
}

/**
 * The same curve for the recording the learner is shadowing.
 *
 * Decoded rather than captured through the speakers, so the model's rhythm is
 * exactly what was rendered and the comparison is not measuring the room.
 */
export async function envelopeOfAudioFile(url: string): Promise<SpeechEnvelope | null> {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return null;

  let decoded: AudioBuffer;
  const context = new AudioContextClass();
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    decoded = await context.decodeAudioData(await response.arrayBuffer());
  } catch {
    return null;
  } finally {
    void context.close();
  }

  return envelopeOfSamples(decoded.getChannelData(0), decoded.sampleRate);
}

/**
 * Reduces raw samples to one RMS value per frame.
 *
 * Exported because it is the only part of this file that can be tested without
 * a browser, and the arithmetic is where a rhythm measure would go wrong
 * silently.
 */
export function envelopeOfSamples(
  samples: Float32Array | readonly number[],
  sampleRate: number,
): SpeechEnvelope {
  const samplesPerFrame = Math.max(1, Math.round(sampleRate / FRAME_RATE));
  const frames: number[] = [];
  for (let start = 0; start + samplesPerFrame <= samples.length; start += samplesPerFrame) {
    let sum = 0;
    for (let offset = 0; offset < samplesPerFrame; offset += 1) {
      const sample = samples[start + offset] ?? 0;
      sum += sample * sample;
    }
    frames.push(Math.sqrt(sum / samplesPerFrame));
  }
  return { frames, frameRate: FRAME_RATE };
}

function rootMeanSquare(samples: Float32Array): number {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}
