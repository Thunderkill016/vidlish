import "server-only";

import catalogue from "@/adapters/vocabulary/cefrj-a1-a2.json";
import spokenFrequency from "@/adapters/vocabulary/spoken-frequency.json";
import { beginnerSentencesFor } from "@/adapters/vocabulary/beginner-sentence-catalogue";
import { FixtureBeginnerInputProvider } from "@/adapters/fake/fixture-beginner-input-provider";
import { GeminiBeginnerInputProvider } from "@/adapters/gemini/gemini-beginner-input-provider";
import type { BeginnerInputProvider } from "@/modules/learning/ports/beginner-input-provider";
import {
  applySpokenFrequency,
  type VocabularyEntry,
} from "@/modules/learning/application/select-next-vocabulary";
import { getServerConfig } from "@/platform/config/server";

/**
 * Everything the beginner session needs that is not evidence.
 *
 * The catalogue and the sentence corpus are files, not services: what a learner
 * meets in their first thousand words must not depend on a network call to
 * anyone, and a session assembled today has to be explainable tomorrow.
 */

export const BEGINNER_SENTENCES_PER_SESSION = 3;

// Applied once at module load: the ordering rule lives in the application
// layer and the numbers live in an artifact, so this is the one place the two
// meet.
applySpokenFrequency(spokenFrequency as Record<string, number>);

export function beginnerVocabularyCatalogue(): readonly VocabularyEntry[] {
  return catalogue as readonly VocabularyEntry[];
}

export function beginnerCandidatesFor(target: string): readonly string[] {
  return beginnerSentencesFor(target).map((sentence) => sentence.text);
}

/**
 * Generation is only reachable with a real key, and its absence is not an
 * error: retrieval covers most targets on its own, and a session that cannot
 * generate should say it found no usable input rather than pretend a provider
 * exists.
 */
export function createBeginnerInputProvider(): BeginnerInputProvider | null {
  const config = getServerConfig();
  // The fixture exists so the sentence phase runs somewhere other than
  // production. Retrieval covers almost nothing until a learner has dozens of
  // words, so without it every test fell through to the single-word
  // introduction and the sentence code was never executed by anything.
  if (config.LEARNING_AUTHORING_PROVIDER === "fixture") {
    return new FixtureBeginnerInputProvider();
  }
  if (config.LEARNING_AUTHORING_PROVIDER !== "gemini") return null;
  if (!config.GEMINI_API_KEY) return null;
  return new GeminiBeginnerInputProvider({
    apiKey: config.GEMINI_API_KEY,
    modelId: config.LESSON_MODEL_ID,
  });
}
