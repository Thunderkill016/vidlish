import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import type { FoundationUnit } from "@/shared/contracts/curriculum";

import {
  chunkWordCount,
  markChunkRecall,
  selectChunkRecall,
  type ChunkRecallItem,
} from "./build-chunk-recall";

const unit = (id: string, chunks: [string, string][]): FoundationUnit =>
  ({
    id,
    targetChunks: chunks.map(([text, vi]) => ({ text, vi })),
  }) as unknown as FoundationUnit;

const item = (answer: string): ChunkRecallItem => ({
  promptVi: "x",
  answer,
  unitId: "u",
  words: chunkWordCount(answer),
});

describe("marking a whole chunk the learner wrote out", () => {
  it("forgives case, punctuation and stray spaces", () => {
    const target = item("nice to meet you");
    for (const written of [
      "nice to meet you",
      "Nice to meet you.",
      "  NICE  TO  MEET  YOU  ",
      "Nice, to meet you!",
    ]) {
      expect(markChunkRecall(target, written)).toBe(true);
    }
  });

  it("does not forgive word order", () => {
    // The learner is being asked for a stored form. Accepting a rearrangement
    // teaches the rearrangement, and the whole value of a chunk is that it
    // comes out whole.
    expect(markChunkRecall(item("nice to meet you"), "meet you nice to")).toBe(false);
  });

  it("does not forgive a missing or extra word", () => {
    const target = item("what's your name");
    expect(markChunkRecall(target, "what's your")).toBe(false);
    expect(markChunkRecall(target, "what's your name again")).toBe(false);
  });

  it("keeps an apostrophe, because it is part of the word", () => {
    expect(markChunkRecall(item("i don't understand"), "i dont understand")).toBe(
      false,
    );
    expect(markChunkRecall(item("i don't understand"), "I don't understand.")).toBe(
      true,
    );
  });
});

describe("choosing which chunks to ask for", () => {
  const known = new Set(["my", "name", "is", "nice", "to", "meet", "you"]);

  it("skips single words, which the cloze exercise already covers", () => {
    const items = selectChunkRecall({
      units: [unit("u1", [["name", "tên"], ["my name is", "tên tôi là"]])],
      known,
      wanted: 5,
    });
    expect(items.map((entry) => entry.answer)).toEqual(["my name is"]);
  });

  it("refuses a chunk containing a word the learner never produced", () => {
    // Asking for a chunk built from unknown words is a test, not practice.
    const items = selectChunkRecall({
      units: [unit("u1", [["where is the station", "ga ở đâu"]])],
      known,
      wanted: 5,
    });
    expect(items).toEqual([]);
  });

  it("puts the shortest chunk first — it is the smaller step", () => {
    const items = selectChunkRecall({
      units: [
        unit("u1", [
          ["nice to meet you", "rất vui được gặp bạn"],
          ["my name is", "tên tôi là"],
        ]),
      ],
      known,
      wanted: 5,
    });
    expect(items.map((entry) => entry.words)).toEqual([3, 4]);
  });

  it("never asks for the same chunk twice", () => {
    const items = selectChunkRecall({
      units: [
        unit("u1", [["my name is", "tên tôi là"]]),
        unit("u2", [["My name is", "tên tôi là"]]),
      ],
      known,
      wanted: 5,
    });
    expect(items).toHaveLength(1);
  });

  it("finds real chunks in the real syllabus", () => {
    // 101 of the 122 authored chunks are multi-word, and they are exactly the
    // formulaic sequences the research is about: "nice to meet you",
    // "i don't understand".
    const everything = new Set(
      FOUNDATION_UNITS.flatMap((entry) =>
        entry.targetChunks.flatMap((chunk) =>
          chunk.text.toLocaleLowerCase("en-US").split(/\s+/).map((word) =>
            word.replace(/[^a-z']/g, ""),
          ),
        ),
      ),
    );
    const items = selectChunkRecall({
      units: FOUNDATION_UNITS,
      known: everything,
      wanted: 200,
    });
    expect(items.length).toBeGreaterThan(50);
    for (const entry of items) {
      expect(entry.words).toBeGreaterThanOrEqual(2);
      expect(entry.promptVi.length).toBeGreaterThan(0);
    }
  });
});
