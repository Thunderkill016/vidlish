import { describe, expect, it } from "vitest";

import { FOUNDATION_UNITS } from "@/modules/curriculum/content";
import type { FoundationUnit } from "@/shared/contracts/curriculum";

import {
  markTransferProbe,
  selectTransferProbes,
  type TransferProbe,
} from "./build-transfer-probe";

const unit = (
  id: string,
  chunks: [string, string][],
  evidenceCriteria: { chunk: string; changedContext: boolean }[],
  scenes: { id: string; speaker: string; text: string }[] = [
    { id: "s1", speaker: "A", text: "Sample scene." },
  ],
): FoundationUnit =>
  ({
    id,
    targetChunks: chunks.map(([text, vi]) => ({ text, vi })),
    evidenceCriteria: evidenceCriteria.map((criterion) => ({
      ...criterion,
      independent: true,
      delayed: true,
    })),
    inputScenes: scenes,
  }) as unknown as FoundationUnit;

const probe = (chunk: string): TransferProbe => ({
  chunk,
  chunkVi: "nghĩa",
  scenarioVi: "Bối cảnh tình huống thực tế.",
  unitId: "u1",
  sourceSceneId: "s1",
});

describe("marking transfer probe answers", () => {
  it("forgives case, punctuation and surrounding spaces", () => {
    const target = probe("again please");
    for (const written of [
      "again please",
      "Again please.",
      "  AGAIN  PLEASE  ",
      "Again, please!",
    ]) {
      expect(markTransferProbe(target, written)).toBe(true);
    }
  });

  it("rejects wrong word order", () => {
    expect(markTransferProbe(probe("again please"), "please again")).toBe(false);
  });

  it("preserves apostrophes in contractions", () => {
    expect(
      markTransferProbe(probe("i don't understand"), "i dont understand"),
    ).toBe(false);
    expect(
      markTransferProbe(probe("i don't understand"), "I don't understand."),
    ).toBe(true);
  });
});

describe("selecting transfer probes from curriculum", () => {
  const known = new Set(["i", "don't", "understand", "again", "please", "sorry"]);

  it("only selects chunks with changedContext: true in evidence criteria", () => {
    const units = [
      unit(
        "u1",
        [
          ["i don't understand", "tôi không hiểu"],
          ["again please", "nói lại giúp tôi"],
        ],
        [
          { chunk: "i don't understand", changedContext: true },
          { chunk: "again please", changedContext: false },
        ],
      ),
    ];

    const selected = selectTransferProbes({
      units,
      known,
      wanted: 5,
    });

    expect(selected.map((p) => p.chunk)).toEqual(["i don't understand"]);
  });

  it("refuses chunks if any word in the chunk is unknown to learner", () => {
    const units = [
      unit(
        "u1",
        [["where is the station", "ga ở đâu"]],
        [{ chunk: "where is the station", changedContext: true }],
      ),
    ];

    const selected = selectTransferProbes({
      units,
      known,
      wanted: 5,
    });

    expect(selected).toEqual([]);
  });

  it("skips chunks that were already probed in this session", () => {
    const units = [
      unit(
        "u1",
        [["i don't understand", "tôi không hiểu"]],
        [{ chunk: "i don't understand", changedContext: true }],
      ),
    ];

    const selected = selectTransferProbes({
      units,
      known,
      wanted: 5,
      alreadyProbed: new Set(["i don't understand"]),
    });

    expect(selected).toEqual([]);
  });

  it("anchors sourceSceneId to the scene containing the chunk", () => {
    const units = [
      unit(
        "u1",
        [["i don't understand", "tôi không hiểu"]],
        [{ chunk: "i don't understand", changedContext: true }],
        [
          { id: "s-intro", speaker: "A", text: "Hello there." },
          { id: "s-repeat", speaker: "B", text: "Sorry, I don't understand." },
        ],
      ),
    ];

    const selected = selectTransferProbes({
      units,
      known,
      wanted: 5,
    });

    expect(selected[0]?.sourceSceneId).toBe("s-repeat");
  });

  it("finds valid transfer chunks across the real foundation syllabus", () => {
    const allWords = new Set(
      FOUNDATION_UNITS.flatMap((u) =>
        u.targetChunks.flatMap((c) =>
          c.text.toLocaleLowerCase("en-US").split(/\s+/).map((w) => w.replace(/[^a-z']/g, "")),
        ),
      ),
    );

    const probes = selectTransferProbes({
      units: FOUNDATION_UNITS,
      known: allWords,
      wanted: 100,
    });

    expect(probes.length).toBeGreaterThan(0);
    for (const p of probes) {
      expect(p.scenarioVi).toContain("Viết câu tiếng Anh");
      expect(p.chunk.length).toBeGreaterThan(0);
    }
  });
});
