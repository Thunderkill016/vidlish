import { describe, expect, it, vi } from "vitest";

import { checkComprehensibleInput } from "@/modules/learning/application/check-comprehensible-input";
import { startBeginnerSession } from "@/modules/learning/application/start-beginner-session";

import {
  STARTER_AUDIO_PROVENANCE,
  STARTER_CATALOGUE,
  STARTER_CATALOGUE_PROVENANCE,
  STARTER_LESSONS,
  starterAudioTextFor,
  starterItemFor,
  starterLessonProgressFor,
  starterSentenceFor,
} from "./starter-catalogue";

describe("the reviewed Nếp A0 starter catalogue", () => {
  it("has exactly thirty distinct items in one explicit order", () => {
    expect(STARTER_CATALOGUE_PROVENANCE).toContain("Nếp Starter Catalogue");
    expect(STARTER_CATALOGUE).toHaveLength(30);
    expect(STARTER_CATALOGUE.map((item) => item.curriculumOrder)).toEqual(
      Array.from({ length: 30 }, (_, index) => index + 1),
    );
    expect(new Set(STARTER_CATALOGUE.map((item) => item.word)).size).toBe(30);
  });

  it("organises every A0 item into one complete functional lesson unit", () => {
    expect(STARTER_LESSONS.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5]);
    expect(STARTER_LESSONS.map((lesson) => lesson.firstItemOrder)).toEqual([1, 5, 7, 15, 24]);
    expect(STARTER_LESSONS.map((lesson) => lesson.lastItemOrder)).toEqual([4, 6, 14, 23, 30]);

    for (const item of STARTER_CATALOGUE) {
      const progress = starterLessonProgressFor(item.word);
      expect(progress).toBeDefined();
      if (!progress) continue;

      expect(progress.lesson.canDoVi).not.toHaveLength(0);
      expect(progress.itemPosition).toBeGreaterThanOrEqual(1);
      expect(progress.itemPosition).toBeLessThanOrEqual(progress.itemCount);
      expect(progress.isFinalItem).toBe(
        item.curriculumOrder === progress.lesson.lastItemOrder,
      );
    }

    for (const lesson of STARTER_LESSONS) {
      const checkpointWords =
        lesson.checkpoint.expectedText.toLocaleLowerCase("en-US").match(/[a-z]+/g) ?? [];
      const availableWords = new Set(
        STARTER_CATALOGUE.slice(0, lesson.lastItemOrder).map((item) => item.word),
      );
      for (const word of checkpointWords) {
        expect(availableWords).toContain(word);
      }
    }

    const firstLessonRecognition = STARTER_LESSONS[0]?.checkpoint.recognition;
    expect(firstLessonRecognition).toBeDefined();
    expect(firstLessonRecognition?.options).toHaveLength(3);
    expect(
      firstLessonRecognition?.options.some(
        (option) => option.id === firstLessonRecognition.correctOptionId,
      ),
    ).toBe(true);
    expect(firstLessonRecognition?.promptVi).not.toContain(
      STARTER_LESSONS[0]?.checkpoint.expectedText ?? "",
    );
  });

  it("provides an inspectable learner-facing asset for every item", () => {
    for (const item of STARTER_CATALOGUE) {
      expect(item.displayText).not.toHaveLength(0);
      expect(item.meaningVi).not.toHaveLength(0);
      expect(item.canDoVi).not.toHaveLength(0);
      expect(item.pronunciationHintVi).not.toHaveLength(0);
      expect(starterItemFor(item.word)).toBe(item);
      expect(starterAudioTextFor(item.displayText)).toBe(item.displayText);

      if (item.introduceOnItsOwn) {
        expect(item.sentences).toEqual([]);
      } else {
        expect(item.sentences).toHaveLength(3);
      }
    }
  });

  it("gives every item a reviewed A0 learning loop, not only a gloss", () => {
    expect(STARTER_AUDIO_PROVENANCE.status).toBe("source_audio_when_available");

    for (const item of STARTER_CATALOGUE) {
      const asset = item.learningAsset;
      expect(asset.microContextVi).not.toHaveLength(0);
      expect(asset.recallPromptVi).not.toHaveLength(0);
      expect(asset.audio).toBe(STARTER_AUDIO_PROVENANCE);

      expect(asset.recognition.promptVi).not.toHaveLength(0);
      expect(asset.recognition.options).toHaveLength(3);
      expect(
        new Set(asset.recognition.options.map((option) => option.id)).size,
      ).toBe(asset.recognition.options.length);
      expect(
        asset.recognition.options.find(
          (option) => option.id === asset.recognition.correctOptionId,
        ),
      ).toBeDefined();
      expect(asset.recognition.correctFeedbackVi).not.toHaveLength(0);
      expect(asset.recognition.incorrectFeedbackVi).not.toHaveLength(0);

      const transfer = asset.transfer;
      expect(transfer.situationVi).not.toHaveLength(0);
      expect(transfer.situationVi).not.toBe(asset.microContextVi);
      expect(transfer.promptVi).not.toHaveLength(0);
      expect(transfer.expectedText).not.toHaveLength(0);
      expect(transfer.expectedMeaningVi).not.toHaveLength(0);
      expect(transfer.feedbackVi).not.toHaveLength(0);

      const availableAfterOrder =
        transfer.unlockAfterOrder ?? item.curriculumOrder;
      expect(availableAfterOrder).toBeGreaterThanOrEqual(item.curriculumOrder);
      expect(availableAfterOrder).toBeLessThanOrEqual(STARTER_CATALOGUE.length);

      const wordsAllowedInTransfer = new Set(
        STARTER_CATALOGUE.slice(0, availableAfterOrder).map(
          (knownItem) => knownItem.word,
        ),
      );
      const transferWords =
        transfer.expectedText.toLocaleLowerCase("en-US").match(/[a-z]+/g) ?? [];
      for (const word of transferWords) {
        expect(wordsAllowedInTransfer).toContain(word);
      }
    }
  });

  it("makes every authored sentence a strict i+1 step", () => {
    STARTER_CATALOGUE.forEach((item, index) => {
      const known = new Set(
        STARTER_CATALOGUE.slice(0, index).map((previous) => previous.word),
      );

      for (const sentence of item.sentences) {
        expect(
          checkComprehensibleInput({ sentence: sentence.text, known }),
        ).toEqual({ kind: "usable", newWords: [item.word] });
        expect(starterSentenceFor(item.word, sentence.text)).toBe(sentence);
        expect(starterAudioTextFor(sentence.text)).toBe(sentence.text);
        expect(sentence.vi).not.toHaveLength(0);
      }
    });
  });

  it("never lets a browser turn the source-audio endpoint into arbitrary TTS", () => {
    expect(starterAudioTextFor("Hello.")).toBe("Hello.");
    expect(starterAudioTextFor("Please help me.")).toBe("Please help me.");
    expect(starterAudioTextFor("Read my private note.")).toBeUndefined();
    expect(starterAudioTextFor(" hello ")).toBeUndefined();
  });

  it("never invokes a model while serving the thirty-item opening", async () => {
    const generate = vi.fn(async () => {
      throw new Error("the authored A0 opening must not generate content");
    });

    for (const [index, item] of STARTER_CATALOGUE.entries()) {
      const known = new Set(
        STARTER_CATALOGUE.slice(0, index).map((previous) => previous.word),
      );
      const outcome = await startBeginnerSession({
        catalogue: STARTER_CATALOGUE,
        known,
        candidatesFor: (target) => starterItemFor(target)?.sentences.map(
          (sentence) => sentence.text,
        ) ?? [],
        generate,
        wanted: 3,
      });

      if (item.introduceOnItsOwn) {
        expect(outcome).toEqual({
          kind: "introduce_word",
          target: item.word,
          knownWordCount: known.size,
        });
      } else {
        expect(outcome.kind).toBe("ready");
        if (outcome.kind !== "ready") {
          throw new Error(`Expected an authored session for ${item.word}`);
        }
        expect(outcome.plan.target).toBe(item.word);
        expect(outcome.plan.source).toBe("retrieved");
        expect(outcome.plan.sentences).toHaveLength(3);
      }
    }

    expect(generate).not.toHaveBeenCalled();
  });
});
