import { createHash } from "node:crypto";

import {
  TRANSCRIPT_NORMALIZATION_VERSION,
  canonicalTranscriptSchema,
  transcriptCandidateSchema,
  type CanonicalTranscript,
  type TranscriptCandidate,
} from "@/shared/contracts/transcript";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/ *\n+ */g, " ")
    .trim();
}

function normalizeLanguage(value: string | undefined): string | undefined {
  const normalized = value?.normalize("NFC").trim();
  return normalized ? normalized : undefined;
}

export class TranscriptNormalizationError extends Error {
  readonly name = "TranscriptNormalizationError";
}

export function normalizeTranscript(
  rawCandidate: TranscriptCandidate,
): CanonicalTranscript {
  const candidate = transcriptCandidateSchema.parse(rawCandidate);
  if (candidate.translationStatus === "translated") {
    throw new TranscriptNormalizationError(
      "Translated captions cannot become canonical source speech.",
    );
  }

  const normalizedChunks = candidate.chunks
    .map((chunk) => {
      const text = normalizeText(chunk.text);
      const endMs = chunk.offsetMs + chunk.durationMs;
      if (
        !Number.isSafeInteger(chunk.offsetMs) ||
        !Number.isSafeInteger(chunk.durationMs) ||
        !Number.isSafeInteger(endMs) ||
        chunk.durationMs <= 0 ||
        endMs <= chunk.offsetMs
      ) {
        return null;
      }
      return {
        startMs: chunk.offsetMs,
        endMs,
        text,
        ...(chunk.confidence !== undefined
          ? { confidence: chunk.confidence }
          : {}),
        ...(normalizeLanguage(chunk.language)
          ? { detectedLanguage: normalizeLanguage(chunk.language) }
          : {}),
      };
    })
    .filter((chunk): chunk is NonNullable<typeof chunk> => Boolean(chunk?.text))
    .sort(
      (left, right) =>
        left.startMs - right.startMs ||
        left.endMs - right.endMs ||
        left.text.localeCompare(right.text),
    );

  const deduped = normalizedChunks.filter((chunk, index, chunks) => {
    if (index === 0) return true;
    const previous = chunks[index - 1];
    return !(
      previous.startMs === chunk.startMs &&
      previous.endMs === chunk.endMs &&
      previous.text === chunk.text
    );
  });

  if (deduped.length === 0) {
    throw new TranscriptNormalizationError(
      "No valid transcript segments remain after normalization.",
    );
  }

  const declaredLanguage = normalizeLanguage(candidate.declaredLanguage);
  const availableLanguages = [...new Set(
    candidate.availableLanguages
      .map((language) => normalizeLanguage(language))
      .filter((language): language is string => Boolean(language)),
  )].sort();

  const hashPayload = JSON.stringify({
    normalizationVersion: TRANSCRIPT_NORMALIZATION_VERSION,
    videoId: candidate.videoId,
    strategyId: candidate.strategyId,
    provider: candidate.provider,
    sourceType: candidate.sourceType,
    declaredLanguage: declaredLanguage ?? null,
    availableLanguages,
    trackKind: candidate.trackKind,
    translationStatus: candidate.translationStatus,
    chunks: deduped,
  });
  const normalizedHash = sha256(hashPayload);

  const segments = deduped.map((chunk, position) => ({
    id: `seg_${sha256(
      `${normalizedHash}:${position}:${chunk.startMs}:${chunk.endMs}:${chunk.text}`,
    ).slice(0, 32)}`,
    position,
    ...chunk,
  }));

  return canonicalTranscriptSchema.parse({
    videoId: candidate.videoId,
    strategyId: candidate.strategyId,
    provider: candidate.provider,
    sourceType: candidate.sourceType,
    ...(declaredLanguage ? { declaredLanguage } : {}),
    availableLanguages,
    trackKind: candidate.trackKind,
    translationStatus: candidate.translationStatus,
    normalizedHash,
    normalizationVersion: TRANSCRIPT_NORMALIZATION_VERSION,
    durationMs: Math.max(...segments.map((segment) => segment.endMs)),
    segments,
  });
}
