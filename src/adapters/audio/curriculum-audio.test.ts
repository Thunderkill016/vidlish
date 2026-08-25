import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import { ELICITED_IMITATION_ITEMS } from "@/modules/measurement/content/elicited-imitation-items";

import manifest from "./curriculum-audio.json";
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
