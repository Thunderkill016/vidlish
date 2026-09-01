import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import { ELICITED_IMITATION_ITEMS } from "@/modules/measurement/content/elicited-imitation-items";

import manifest from "./curriculum-audio.json";
import { syllablesForLine } from "./curriculum-audio";
import { curriculumAudioFor, normaliseSpokenLine } from "./curriculum-audio";

describe("curriculum audio", () => {
  it("has a recording for every line the syllabus speaks", () => {
    // A missing line is not a cosmetic gap: the learner is told to listen and
    // hears the browser's robot voice instead, which is the thing this
    // replaced.
    const missing: string[] = [];
    for (const unit of FOUNDATION_UNITS) {
      for (const scene of unit.inputScenes) {
        if (!curriculumAudioFor(scene.text)) missing.push(scene.text);
      }
      for (const chunk of unit.targetChunks) {
        if (!curriculumAudioFor(chunk.text)) missing.push(chunk.text);
      }
    }
    expect(missing).toEqual([]);
  });

  it("points at files that exist on disk", () => {
    // The manifest is committed separately from the audio, so a rebuild that
    // wrote one and not the other must fail here rather than in a browser.
    const absent = Object.values(manifest as Record<string, string>).filter(
      (url) => !existsSync(path.join("public", url.replace(/^\//, ""))),
    );
    expect(absent).toEqual([]);
  });

  it("does not claim a recording for language it never rendered", () => {
    // Generated beginner sentences are not in the syllabus, and the caller
    // relies on null to fall back rather than play nothing.
    expect(curriculumAudioFor("the quick brown fox")).toBeNull();
  });

  it("looks a line up the way it was written down", () => {
    const [unit] = FOUNDATION_UNITS;
    const [chunk] = unit.targetChunks;
    expect(curriculumAudioFor(chunk.text.toUpperCase())).not.toBeNull();
    expect(curriculumAudioFor(`  ${chunk.text}  `)).not.toBeNull();
    expect(normaliseSpokenLine("  My   Name  Is ")).toBe("my name is");
  });
});

describe("measurement audio", () => {
  it("has a recording for every item in the imitation bank", () => {
    // A proficiency score is only comparable between sittings if the sentences
    // sounded the same both times. A browser voice that differs by device would
    // move the score without the learner changing.
    const missing = ELICITED_IMITATION_ITEMS.filter(
      (item) => !curriculumAudioFor(item.text),
    ).map((item) => item.id);
    expect(missing).toEqual([]);
  });
});

describe("syllable counts for the lines the syllabus speaks", () => {
  it("counts every recorded line, so no line reaches the scorer without one", () => {
    // A line with audio but no syllable count would reach the rhythm scorer as
    // an unmeasurable, and the scorer would have to refuse a line the learner
    // had already spoken. The two manifests are built from the same list and
    // must not drift apart.
    for (const line of Object.keys(manifest)) {
      expect(syllablesForLine(line)).toBeGreaterThan(0);
    }
  });

  it("agrees with pronunciation on lines whose syllable count is not arguable", () => {
    expect(syllablesForLine("and")).toBe(1);
    expect(syllablesForLine("always")).toBe(2);
    expect(syllablesForLine("anyone")).toBe(3);
  });

  it("normalises the same way the audio lookup does", () => {
    expect(syllablesForLine("  Anyone  ")).toBe(syllablesForLine("anyone"));
    expect(syllablesForLine("a line nobody recorded")).toBeNull();
  });
});
