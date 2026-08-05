import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { SupadataNativeCaptionStrategy } from "@/adapters/supadata/supadata-native-caption-strategy";
import { YouTubeDataApiProvider } from "@/adapters/youtube/youtube-data-api-provider";
import { getServerConfig } from "@/platform/config/server";

export const dynamic = "force-dynamic";

const VIDEO_ID = "dQw4w9WgXcQ";

function safeError(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

export async function GET() {
  const config = getServerConfig();
  const result: Record<string, unknown> = {
    event: "vidlish_provider_probe_f42c91",
    keysPresent: {
      youtube: Boolean(config.YOUTUBE_DATA_API_KEY),
      supadata: Boolean(config.SUPADATA_API_KEY),
      gemini: Boolean(config.GEMINI_API_KEY),
    },
    adapters: {
      video: config.VIDEO_METADATA_ADAPTER,
      transcript: config.TRANSCRIPT_NATIVE_ADAPTER,
      lesson: config.LESSON_PROVIDER,
      dispatcher: config.GENERATION_DISPATCHER,
    },
  };

  try {
    if (!config.YOUTUBE_DATA_API_KEY) throw new Error("missing_key");
    const metadata = await new YouTubeDataApiProvider(
      config.YOUTUBE_DATA_API_KEY,
      config.YOUTUBE_VIEWER_REGION,
      config.YOUTUBE_METADATA_TIMEOUT_MS,
    ).lookup(VIDEO_ID);
    result.youtube = {
      ok: metadata.availability === "playable",
      availability: metadata.availability,
    };
  } catch (error) {
    result.youtube = { ok: false, error: safeError(error) };
  }

  try {
    if (!config.SUPADATA_API_KEY) throw new Error("missing_key");
    const transcript = await new SupadataNativeCaptionStrategy({
      apiKey: config.SUPADATA_API_KEY,
      timeoutMs: config.SUPADATA_NATIVE_TIMEOUT_MS,
    }).acquire({ videoId: VIDEO_ID });
    result.supadata = {
      ok: transcript.kind === "success" || transcript.kind === "not_applicable",
      kind: transcript.kind,
      reason: "reason" in transcript ? transcript.reason : undefined,
      chunkCount:
        transcript.kind === "success" ? transcript.candidate.chunks.length : 0,
    };
  } catch (error) {
    result.supadata = { ok: false, error: safeError(error) };
  }

  try {
    if (!config.GEMINI_API_KEY) throw new Error("missing_key");
    const response = await new GoogleGenAI({
      apiKey: config.GEMINI_API_KEY,
    }).models.generateContent({
      model: config.LESSON_MODEL_ID,
      contents: "Reply with exactly OK",
      config: { maxOutputTokens: 8 },
    });
    result.gemini = {
      ok: response.text?.trim().toUpperCase().includes("OK") ?? false,
      model: response.modelVersion ?? config.LESSON_MODEL_ID,
    };
  } catch (error) {
    result.gemini = { ok: false, error: safeError(error) };
  }

  console.info(JSON.stringify(result));
  return NextResponse.json(
    { status: "completed" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
