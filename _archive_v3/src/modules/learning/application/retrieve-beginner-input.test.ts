import { describe, expect, it } from "vitest";
import { retrieveBeginnerInput } from "./retrieve-beginner-input";
import {
  allBeginnerSentences,
  beginnerSentenceCatalogueSize,
  beginnerSentencesFor,
} from "@/adapters/vocabulary/beginner-sentence-catalogue";

const known = new Set(["i", "have", "a", "the", "is", "cat", "you", "are"]);

describe("retrieveBeginnerInput", () => {
  it("reports retrieved when the corpus supplies enough usable sentences", () => {
    const result = retrieveBeginnerInput({
      target: "water",
      known,
      candidates: ["I have the water.", "The water is a cat."],
      wanted: 2,
    });

    expect(result.source).toBe("retrieved");
    expect(result.sentences).toHaveLength(2);
  });

  it("falls through to generation rather than serving a short batch", () => {
    // A partial batch is the tempting outcome and the wrong one: mixing a
    // retrieved sentence with a generated one leaves no way to tell later
    // which kind a learner struggled with.
    const result = retrieveBeginnerInput({
      target: "water",
      known,
      candidates: ["I have the water.", "I have a dog."],
      wanted: 2,
    });

    expect(result.source).toBe("generation_required");
    expect(result.sentences).toHaveLength(1);
  });

  it("falls through when the corpus has nothing for the target", () => {
    const result = retrieveBeginnerInput({
      target: "water",
      known,
      candidates: [],
      wanted: 1,
    });

    expect(result.source).toBe("generation_required");
  });
});

describe("beginner sentence catalogue", () => {
  it("ships a corpus a person could read", () => {
    expect(beginnerSentenceCatalogueSize()).toBeGreaterThan(10_000);
  });

  it("indexes a sentence under the word it can teach", () => {
    for (const sentence of beginnerSentencesFor("water")) {
      expect(sentence.text.toLocaleLowerCase("en-US")).toContain("water");
    }
  });

  it("only keeps audio whose licence permits reuse outside Tatoeba", () => {
    // An empty licence field means the recording may not leave Tatoeba at all,
    // and the non-commercial licences cover about nine in ten recordings. The
    // build script filters them out; this fails if that filter is ever relaxed.
    const withAudio = allBeginnerSentences().filter((sentence) => sentence.audio);
    // Guards the guard: if the corpus ever ships with no audio at all, the
    // licence assertion below would pass without examining anything.
    expect(withAudio.length).toBeGreaterThan(0);
    for (const sentence of withAudio) {
      expect(["CC BY 4.0", "CC BY-SA 4.0"]).toContain(sentence.audio?.licence);
    }
  });

  it("cannot supply the listening step on its own", () => {
    // 74 of 18,127. Roughly nine in ten Tatoeba recordings are non-commercial
    // and most of the rest carry no licence at all, so synthesized speech is a
    // requirement of the A0 path rather than a cost optimisation.
    const withAudio = allBeginnerSentences().filter((sentence) => sentence.audio);
    expect(withAudio.length / beginnerSentenceCatalogueSize()).toBeLessThan(0.01);
  });
});
