import { NextRequest, NextResponse } from "next/server";

import {
  GeminiStarterAudioProvider,
  type GeneratedStarterAudio,
} from "@/adapters/gemini/gemini-starter-audio";
import { starterAudioTextFor } from "@/adapters/vocabulary/starter-catalogue";
import { getServerConfig } from "@/platform/config/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A source clip is public, fixed curriculum material. Vercel can retain it for
// a year after its first synthesis, amortising one TTS call across every learner
// without ever caching a learner response or recording.
const SOURCE_AUDIO_CACHE_SECONDS = 31_536_000;

// A cold deployment can receive multiple clicks for one phrase before the CDN
// receives its first response. Share only those concurrent calls; retaining
// audio in process would consume memory and would not survive a deployment.
const inFlightByAudioKey = new Map<string, Promise<GeneratedStarterAudio>>();

function audioKey(input: {
  readonly modelId: string;
  readonly voice: string;
  readonly text: string;
}): string {
  return `${input.modelId}\u0000${input.voice}\u0000${input.text}`;
}

function synthesizeOnce(input: {
  readonly apiKey: string;
  readonly modelId: string;
  readonly voice: string;
  readonly text: string;
}): Promise<GeneratedStarterAudio> {
  const key = audioKey(input);
  const alreadyRunning = inFlightByAudioKey.get(key);
  if (alreadyRunning) return alreadyRunning;

  const request = new GeminiStarterAudioProvider({
    apiKey: input.apiKey,
    modelId: input.modelId,
    voice: input.voice,
  }).synthesize(input.text);
  inFlightByAudioKey.set(key, request);
  void request.then(
    () => inFlightByAudioKey.delete(key),
    () => inFlightByAudioKey.delete(key),
  );
  return request;
}

/**
 * This is intentionally not an arbitrary text-to-speech endpoint. The query
 * must match a reviewed A0 string exactly, so it cannot be used to send learner
 * data to Gemini or to spend quota on unbounded public requests.
 */
export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text");
  const approvedText = text ? starterAudioTextFor(text) : undefined;
  if (!approvedText) return new NextResponse(null, { status: 404 });

  const config = getServerConfig();
  if (!config.GEMINI_TTS_ENABLED || !config.GEMINI_API_KEY) {
    return new NextResponse(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const audio = await synthesizeOnce({
      apiKey: config.GEMINI_API_KEY,
      modelId: config.GEMINI_TTS_MODEL_ID,
      voice: config.GEMINI_TTS_VOICE,
      text: approvedText,
    });
    // Next's BodyInit typing only accepts a concrete ArrayBuffer, while the
    // provider boundary deliberately exposes a generic Uint8Array.
    const responseBody = new Uint8Array(audio.body.byteLength);
    responseBody.set(audio.body);
    return new NextResponse(responseBody.buffer, {
      status: 200,
      headers: {
        "Content-Type": audio.contentType,
        "Cache-Control": `public, max-age=0, s-maxage=${SOURCE_AUDIO_CACHE_SECONDS}, immutable`,
      },
    });
  } catch {
    // The client falls back to its own voice and tells the learner that this is
    // not equivalent source audio. Do not leak provider details from a public
    // endpoint, and do not cache a failure for the next learner.
    return new NextResponse(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
