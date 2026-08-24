export type OnDeviceSpeechAvailability =
  | "unsupported"
  | "unavailable"
  | "downloadable"
  | "downloading"
  | "available";

export type OnDeviceSpeechProbeResult = {
  targetPhraseDetected: boolean;
  recognizedWordCount: number;
};

type RecognitionAvailability = Exclude<OnDeviceSpeechAvailability, "unsupported">;

type RecognitionResultLike = {
  0?: { transcript?: string };
};

type RecognitionEventLike = {
  results: ArrayLike<RecognitionResultLike>;
};

type RecognitionErrorEventLike = {
  error?: string;
};

type LocalSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(track?: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
};

type LocalSpeechRecognitionConstructor = {
  new (): LocalSpeechRecognition;
  available?: (options: {
    langs: string[];
    processLocally: true;
    quality: "dictation";
  }) => Promise<RecognitionAvailability>;
  install?: (options: {
    langs: string[];
    processLocally: true;
    quality: "dictation";
  }) => Promise<boolean>;
};

type SpeechRecognitionScope = {
  SpeechRecognition?: LocalSpeechRecognitionConstructor;
};

export type OnDeviceSpeechProbeController = {
  stop(): void;
  abort(): void;
};

function constructorFrom(scope: unknown): LocalSpeechRecognitionConstructor | null {
  if (!scope || typeof scope !== "object") return null;
  const candidate = (scope as SpeechRecognitionScope).SpeechRecognition;
  return typeof candidate === "function" ? candidate : null;
}

export function normalizeRecognizedEnglish(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectRecognizedTargetPhrase(
  transcript: string,
  targetPhrases: readonly string[],
): OnDeviceSpeechProbeResult {
  const recognized = normalizeRecognizedEnglish(transcript);
  const normalizedTargets = targetPhrases
    .map(normalizeRecognizedEnglish)
    .filter(Boolean);

  return {
    targetPhraseDetected:
      recognized.length > 0 &&
      normalizedTargets.some((target) =>
        ` ${recognized} `.includes(` ${target} `),
      ),
    recognizedWordCount: recognized ? recognized.split(" ").length : 0,
  };
}

export async function checkOnDeviceEnglishDictation(
  scope: unknown = globalThis,
): Promise<OnDeviceSpeechAvailability> {
  const Recognition = constructorFrom(scope);
  if (!Recognition?.available) return "unsupported";

  try {
    return await Recognition.available({
      langs: ["en-US"],
      processLocally: true,
      quality: "dictation",
    });
  } catch {
    return "unsupported";
  }
}

export async function installOnDeviceEnglishDictation(
  scope: unknown = globalThis,
): Promise<boolean> {
  const Recognition = constructorFrom(scope);
  if (!Recognition?.install) return false;

  try {
    return await Recognition.install({
      langs: ["en-US"],
      processLocally: true,
      quality: "dictation",
    });
  } catch {
    return false;
  }
}

/**
 * Start a strictly on-device recognition probe against a live audio track.
 *
 * There is deliberately no prefixed/cloud fallback and no transcript callback.
 * Raw recognized text stays inside this function long enough to derive a
 * bounded phrase-detection result, then becomes unreachable. The result is a
 * local diagnostic only; Feature 026 does not persist or project it as skill.
 */
export function startOnDeviceSpeechProbe(input: {
  audioTrack: MediaStreamTrack;
  targetPhrases: readonly string[];
  onResult(result: OnDeviceSpeechProbeResult): void;
  onError?(reason: string): void;
  scope?: unknown;
}): OnDeviceSpeechProbeController | null {
  const Recognition = constructorFrom(input.scope ?? globalThis);
  if (!Recognition) return null;

  const recognition = new Recognition();
  if (!("processLocally" in recognition)) return null;

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.processLocally = true;

  const track = input.audioTrack.clone();
  let finished = false;
  const cleanupTrack = () => {
    if (!finished) {
      finished = true;
      track.stop();
    }
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let index = 0; index < event.results.length; index += 1) {
      transcript += ` ${event.results[index]?.[0]?.transcript ?? ""}`;
    }
    input.onResult(detectRecognizedTargetPhrase(transcript, input.targetPhrases));
  };
  recognition.onerror = (event) => {
    input.onError?.(event.error ?? "on-device-recognition-error");
    cleanupTrack();
  };
  recognition.onend = cleanupTrack;

  try {
    recognition.start(track);
  } catch {
    cleanupTrack();
    input.onError?.("on-device-recognition-start-failed");
    return null;
  }

  return {
    stop() {
      try {
        recognition.stop();
      } catch {
        cleanupTrack();
      }
    },
    abort() {
      try {
        recognition.abort();
      } finally {
        cleanupTrack();
      }
    },
  };
}
