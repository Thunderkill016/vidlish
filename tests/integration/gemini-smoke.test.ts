/**
 * Hits the real Gemini API, so it is skipped unless GEMINI_API_KEY is set. CI
 * has no key and skips it; run it by hand after touching the provider, the
 * prompt, or the draft schema.
 *
 * It exists because everything else about this provider passes with fixtures.
 * The failures it actually caught on the first live run — Gemini rejecting the
 * generated JSON Schema outright, and the provider swallowing the reason — were
 * invisible to every other test in the suite.
 */
import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { GeminiLessonProvider } from "@/adapters/gemini/gemini-lesson-provider";
import {
  hydrateLessonCitations,
  type PermittedSegment,
} from "@/modules/lesson/application/hydrate-lesson-citations";

const SEGMENTS: PermittedSegment[] = [
  "So the first thing I always do when I get to a new city is skip the taxi line.",
  "It sounds counterintuitive, but the train is almost always faster and way cheaper.",
  "I once spent forty minutes in traffic when the train would have taken twelve.",
  "The trick is to figure out the ticket machine before you land.",
  "Most of them have an English option buried in the top right corner.",
  "If you can't find it, just ask someone — people are usually happy to help.",
  "Another thing that trips travelers up is not validating the ticket.",
  "In a lot of European cities you have to stamp it before you board.",
  "If an inspector catches you with an unstamped ticket, you're getting fined.",
  "It doesn't matter that you paid. The rule is the stamp, not the purchase.",
  "I learned that the hard way in Rome, and it cost me about fifty euros.",
  "So now I stamp the ticket the second I walk onto the platform.",
  "Honestly, once you get the hang of it, public transit beats taxis everywhere.",
  "You see more of the city, and you're not stuck watching a meter climb.",
].map((text, index) => ({
  id: `seg_${createHash("md5").update(text).digest("hex")}`,
  startMs: index * 6000,
  endMs: index * 6000 + 5800,
  text,
}));

describe("GeminiLessonProvider against the live API", () => {
  it.skipIf(!process.env.GEMINI_API_KEY)("returns a schema-valid, fully grounded draft", async () => {
    const provider = new GeminiLessonProvider({
      apiKey: process.env.GEMINI_API_KEY ?? "",
      modelId: process.env.LESSON_MODEL_ID ?? "gemini-3.6-flash",
    });

    const started = Date.now();
    const result = await provider.generate({
      cefrLevel: "B1",
      videoTitle: "How I get around any new city",
      channelName: "Travel Notes",
      permittedSegments: SEGMENTS,
    });
    const elapsedMs = Date.now() - started;

    // Grounding gate: throws if the model cited an ID outside the permitted set.
    const citations = hydrateLessonCitations(result.draft, SEGMENTS);

    const permittedIds = new Set(SEGMENTS.map((segment) => segment.id));
    const transcriptText = SEGMENTS.map((segment) => segment.text).join(" ");
    const copiedExamples = result.draft.vocabulary.filter((item) =>
      transcriptText.includes(item.exampleEn),
    );

    console.log(
      JSON.stringify(
        {
          elapsedMs,
          modelId: result.modelId,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          counts: {
            vocabulary: result.draft.vocabulary.length,
            phrases: result.draft.phrases.length,
            grammar: result.draft.grammarPoints.length,
            questions: result.draft.comprehensionQuestions.length,
            cloze: result.draft.clozeItems.length,
            citations: citations.length,
          },
          estimatedLevel: result.draft.estimatedLevel,
          titleVi: result.draft.titleVi,
          copiedExampleCount: copiedExamples.length,
          sampleVocabulary: result.draft.vocabulary.slice(0, 3),
          sampleCloze: result.draft.clozeItems[0],
          sampleQuestion: result.draft.comprehensionQuestions[0],
        },
        null,
        2,
      ),
    );

    expect(citations.length).toBeGreaterThan(0);
    for (const citation of citations) {
      expect(permittedIds.has(citation.segmentId)).toBe(true);
    }
  }, 180_000);
});
