export type EnglishLearningSignals = {
  wordCount: number;
  uniqueWordCount: number;
  sentenceCount: number;
  averageSentenceWords: number;
  lexicalDiversity: number;
  longWordShare: number;
  contractionCount: number;
  questionCount: number;
  discourseMarkerHits: number;
  durationMs: number;
  speechRateWpm: number | null;
};

type TranscriptSegment = Readonly<{
  text: string;
  startMs: number;
  endMs: number;
}>;

const WORD_PATTERN = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const DISCOURSE_MARKERS = [
  "actually",
  "although",
  "anyway",
  "basically",
  "because",
  "however",
  "instead",
  "meanwhile",
  "otherwise",
  "therefore",
  "though",
  "unless",
  "whereas",
] as const;

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sentenceCount(text: string): number {
  const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
  const count = [...segmenter.segment(text)].filter(
    (segment) => segment.segment.trim().length > 0,
  ).length;
  return Math.max(1, count);
}

/**
 * Cheap, deterministic signals derived only from the already-permitted English
 * transcript. They are selection hints, not CEFR labels and not learning
 * evidence. Keeping this step deterministic prevents the model from inventing
 * difficulty claims before it writes a lesson.
 */
export function analyzeEnglishLearningSignals(
  segments: ReadonlyArray<TranscriptSegment>,
): EnglishLearningSignals {
  const text = segments.map((segment) => segment.text).join(" ").trim();
  const words = text.match(WORD_PATTERN) ?? [];
  const normalizedWords = words.map((word) => word.toLowerCase().replace("’", "'"));
  const uniqueWordCount = new Set(normalizedWords).size;
  const sentences = sentenceCount(text);
  const longWords = normalizedWords.filter((word) => word.replace(/'/g, "").length >= 7).length;
  const contractionCount = normalizedWords.filter((word) => word.includes("'")).length;
  const lowerText = ` ${text.toLowerCase()} `;
  const discourseMarkerHits = DISCOURSE_MARKERS.reduce((total, marker) => {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matches = lowerText.match(new RegExp(`\\b${escaped}\\b`, "g"));
    return total + (matches?.length ?? 0);
  }, 0);
  const questionCount = (text.match(/\?/g) ?? []).length;

  const starts = segments.map((segment) => segment.startMs).filter(Number.isFinite);
  const ends = segments.map((segment) => segment.endMs).filter(Number.isFinite);
  const durationMs =
    starts.length > 0 && ends.length > 0
      ? Math.max(0, Math.max(...ends) - Math.min(...starts))
      : 0;
  const speechRateWpm =
    durationMs > 0 && words.length > 0
      ? round(words.length / (durationMs / 60_000), 1)
      : null;

  return {
    wordCount: words.length,
    uniqueWordCount,
    sentenceCount: sentences,
    averageSentenceWords: round(words.length / sentences, 1),
    lexicalDiversity: words.length > 0 ? round(uniqueWordCount / words.length) : 0,
    longWordShare: words.length > 0 ? round(longWords / words.length) : 0,
    contractionCount,
    questionCount,
    discourseMarkerHits,
    durationMs,
    speechRateWpm,
  };
}

export function renderEnglishLearningSignals(signals: EnglishLearningSignals): string {
  return [
    `words=${signals.wordCount}`,
    `sentences=${signals.sentenceCount}`,
    `avgSentenceWords=${signals.averageSentenceWords}`,
    `lexicalDiversity=${signals.lexicalDiversity}`,
    `longWordShare=${signals.longWordShare}`,
    `contractions=${signals.contractionCount}`,
    `discourseMarkers=${signals.discourseMarkerHits}`,
    `questions=${signals.questionCount}`,
    `speechRateWpm=${signals.speechRateWpm ?? "unknown"}`,
  ].join(", ");
}
