import "server-only";

import { Buffer } from "node:buffer";

import { GoogleGenAI } from "@google/genai";

/** Gemini TTS returns signed 16-bit PCM at 24 kHz unless it says otherwise. */
export const DEFAULT_GEMINI_TTS_SAMPLE_RATE_HZ = 24_000;
export const DEFAULT_GEMINI_TTS_CHANNELS = 1;

const PCM_SAMPLE_SIZE_BYTES = 2;
const WAV_HEADER_BYTES = 44;
const MIN_SAMPLE_RATE_HZ = 8_000;
const MAX_SAMPLE_RATE_HZ = 192_000;
const MIN_CHANNELS = 1;
const MAX_CHANNELS = 2;
const MAX_STARTER_AUDIO_TEXT_LENGTH = 200;
const REQUEST_TIMEOUT_MS = 45_000;

export type GeminiStarterAudioOptions = {
  readonly apiKey: string;
  readonly modelId: string;
  readonly voice: string;
};

export type GeneratedStarterAudio = {
  readonly body: Uint8Array;
  readonly contentType: "audio/wav";
};

type GeminiAudioPayload = {
  readonly data?: string;
  readonly sample_rate?: number;
  readonly channels?: number;
};

/**
 * The language learner sees only the phrase. The extra structure prevents the
 * common TTS failure mode where a model recites its own directions instead.
 */
export function buildGeminiStarterAudioPrompt(text: string): string {
  if (text.length === 0 || text.length > MAX_STARTER_AUDIO_TEXT_LENGTH) {
    throw new Error("Starter audio text is outside the reviewed length limit.");
  }

  return [
    "Produce audio only for the learner text between the tags.",
    "Read that text exactly once in clear, neutral American English.",
    "Do not translate, spell, explain, or read these directions.",
    "<learner-text>",
    text,
    "</learner-text>",
  ].join("\n");
}

function assertPcmFormat(sampleRate: number, channels: number): void {
  if (
    !Number.isInteger(sampleRate) ||
    sampleRate < MIN_SAMPLE_RATE_HZ ||
    sampleRate > MAX_SAMPLE_RATE_HZ
  ) {
    throw new Error("Gemini TTS returned an unsupported sample rate.");
  }
  if (
    !Number.isInteger(channels) ||
    channels < MIN_CHANNELS ||
    channels > MAX_CHANNELS
  ) {
    throw new Error("Gemini TTS returned an unsupported channel count.");
  }
}

/** Converts Gemini's raw signed PCM response into a browser-playable WAV file. */
export function pcm16ToWav(
  pcm: Uint8Array,
  sampleRate = DEFAULT_GEMINI_TTS_SAMPLE_RATE_HZ,
  channels = DEFAULT_GEMINI_TTS_CHANNELS,
): Uint8Array {
  assertPcmFormat(sampleRate, channels);

  const blockAlign = channels * PCM_SAMPLE_SIZE_BYTES;
  if (pcm.byteLength === 0 || pcm.byteLength % blockAlign !== 0) {
    throw new Error("Gemini TTS returned malformed PCM audio.");
  }

  const wav = Buffer.alloc(WAV_HEADER_BYTES + pcm.byteLength);
  wav.write("RIFF", 0, "ascii");
  wav.writeUInt32LE(wav.byteLength - 8, 4);
  wav.write("WAVE", 8, "ascii");
  wav.write("fmt ", 12, "ascii");
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * blockAlign, 28);
  wav.writeUInt16LE(blockAlign, 32);
  wav.writeUInt16LE(PCM_SAMPLE_SIZE_BYTES * 8, 34);
  wav.write("data", 36, "ascii");
  wav.writeUInt32LE(pcm.byteLength, 40);
  wav.set(pcm, WAV_HEADER_BYTES);
  return wav;
}

/**
 * Validates the only output shape this endpoint accepts. TTS must never return
 * model text into an audio route, even if the transport response is successful.
 */
export function readGeminiStarterAudio(
  payload: GeminiAudioPayload | undefined,
): GeneratedStarterAudio {
  if (!payload?.data) {
    throw new Error("Gemini TTS returned no audio payload.");
  }

  const pcm = Buffer.from(payload.data, "base64");
  return {
    body: pcm16ToWav(
      pcm,
      payload.sample_rate ?? DEFAULT_GEMINI_TTS_SAMPLE_RATE_HZ,
      payload.channels ?? DEFAULT_GEMINI_TTS_CHANNELS,
    ),
    contentType: "audio/wav",
  };
}

export class GeminiStarterAudioProvider {
  private readonly client: GoogleGenAI;

  constructor(private readonly options: GeminiStarterAudioOptions) {
    this.client = new GoogleGenAI({ apiKey: options.apiKey });
  }

  async synthesize(text: string): Promise<GeneratedStarterAudio> {
    const interaction = await this.client.interactions.create(
      {
        model: this.options.modelId,
        input: buildGeminiStarterAudioPrompt(text),
        response_format: { type: "audio" },
        generation_config: {
          speech_config: [{ voice: this.options.voice, language: "en" }],
        },
        // The phrase is immutable catalogue content; it is not a conversation
        // that needs to be retained by Gemini for a later learner turn.
        store: false,
      },
      { timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 },
    );

    return readGeminiStarterAudio(interaction.output_audio);
  }
}
