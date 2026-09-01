import { curriculumAudioFor } from "@/adapters/audio/curriculum-audio";

/**
 * Plays one English line for the learner.
 *
 * Prefers the recording rendered at build time. Falls back to the browser's own
 * voice only for language that was never rendered — generated beginner
 * sentences — because a silent "listen" button is worse than a robot one: the
 * learner is told to listen, hears nothing, and concludes the problem is their
 * ears.
 *
 * `rate` is only honoured by the fallback. Slowing a recording down in the
 * browser without pitch correction produces a voice no human makes, and a
 * beginner cannot tell that distortion apart from an accent they have not
 * learned yet.
 */
export type LinePlayer = { stop(): void };

export function playEnglishLines(
  lines: readonly string[],
  options: { readonly fallbackRate?: number } = {},
): LinePlayer {
  if (typeof window === "undefined") return { stop() {} };

  const elements: HTMLAudioElement[] = [];
  let cancelled = false;

  window.speechSynthesis?.cancel();

  void (async () => {
    for (const line of lines) {
      if (cancelled) return;
      const recorded = curriculumAudioFor(line);
      if (recorded) {
        await playFile(recorded, elements, () => cancelled);
        continue;
      }
      speakWithBrowser(line, options.fallbackRate ?? 0.75);
    }
  })();

  return {
    stop() {
      cancelled = true;
      for (const element of elements) {
        element.pause();
        element.src = "";
      }
      window.speechSynthesis?.cancel();
    },
  };
}

function playFile(
  url: string,
  elements: HTMLAudioElement[],
  cancelled: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    elements.push(audio);
    // Resolve on error as well as on end. A line that fails to load must not
    // wedge the rest of the sequence — the learner would sit in front of a
    // button that did nothing and never find out why.
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    if (cancelled()) {
      resolve();
      return;
    }
    void audio.play().catch(() => resolve());
  });
}

function speakWithBrowser(line: string, rate: number): void {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(line);
  utterance.lang = "en-US";
  utterance.rate = rate;
  window.speechSynthesis.speak(utterance);
}
