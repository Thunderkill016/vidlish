import { describe, expect, it } from "vitest";

import type { GoldenSessionUsabilityParticipant } from "@/shared/contracts/golden-session-usability";
import {
  createGoldenSessionParticipantFile,
  parseGoldenSessionParticipantJson,
  readGoldenSessionStudyFiles,
  serializeGoldenSessionStudy,
} from "./golden-session-study-files";

function participant(index: number): GoldenSessionUsabilityParticipant {
  const digit = String(index).padStart(8, String(index));
  const sessionId = `${digit}-${digit.slice(0, 4)}-4${digit.slice(1, 4)}-8${digit.slice(1, 4)}-${digit}${digit.slice(0, 4)}`;

  return {
    measurement: {
      sessionId,
      status: "completed",
      sessionViewed: true,
      completed: true,
      observedElapsedSeconds: 300,
      lastKnownActivityId: "activity_exit",
      incompleteAtLastKnownActivity: null,
      firstSource: {
        activityId: "activity_gist",
        playStarted: true,
        playCompleted: true,
        replayed: false,
      },
      gist: {
        activityId: "activity_gist",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      targetNotice: {
        activityId: "activity_meaning",
        attempted: true,
      },
      correction: {
        incorrectAttemptCount: 0,
        shownCount: 0,
      },
      retrieval: {
        activityId: "activity_recall",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      transfer: {
        activityId: "activity_transfer",
        attemptCount: 1,
        latestVerdict: "self_check",
        correctCount: 0,
      },
      afterListen: {
        activityId: "activity_exit",
        attemptCount: 1,
        latestVerdict: "unscored",
        correctCount: 0,
      },
      supportByActivity: [],
      totalSupportStepsOpened: 0,
      runtimeErrors: [],
    },
    observation: {
      participantCode: `p${index}`,
      platform: index % 2 === 0 ? "mobile" : "desktop",
      completedWithoutModeratorInstruction: true,
      lessonGoalRestated: true,
      beforeTargetRecognition: "not_recognized",
      afterTargetRecognition: "recognized",
      blocked: false,
      blockKind: null,
      severeDefectKind: null,
    },
  };
}

function localFile(value: GoldenSessionUsabilityParticipant) {
  const descriptor = createGoldenSessionParticipantFile(value);
  return {
    name: descriptor.fileName,
    size: new TextEncoder().encode(descriptor.content).byteLength,
    async text() {
      return descriptor.content;
    },
  };
}

describe("Golden Session local study files", () => {
  it("creates a deterministic privacy-safe participant filename and canonical JSON", () => {
    const value = participant(1);
    const file = createGoldenSessionParticipantFile(value);

    expect(file.fileName).toBe("vidlish-gate5-p1-11111111.json");
    expect(file.mimeType).toBe("application/json");
    expect(parseGoldenSessionParticipantJson(file.content)).toEqual(value);
  });

  it("reads exactly five files through the existing strict study schema", async () => {
    const files = [1, 2, 3, 4, 5].map((index) => localFile(participant(index)));
    const study = await readGoldenSessionStudyFiles(files);

    expect(study.participants).toHaveLength(5);
    expect(JSON.parse(serializeGoldenSessionStudy(study))).toEqual(study);
  });

  it("rejects a duplicate durable session through the authoritative study schema", async () => {
    const values = [1, 2, 3, 4, 5].map(participant);
    values[4] = {
      ...values[4],
      measurement: {
        ...values[4].measurement,
        sessionId: values[0].measurement.sessionId,
      },
    };

    await expect(
      readGoldenSessionStudyFiles(values.map(localFile)),
    ).rejects.toThrow(/Session IDs must be unique/);
  });

  it("rejects arbitrary fields and never accepts fewer than five files", async () => {
    const value = participant(1);
    const raw = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    raw.freeFormNotes = "PRIVATE NOTES";
    expect(() => parseGoldenSessionParticipantJson(JSON.stringify(raw))).toThrow();

    await expect(readGoldenSessionStudyFiles([localFile(value)])).rejects.toThrow(
      /đúng 5 participant JSON/,
    );
  });
});
