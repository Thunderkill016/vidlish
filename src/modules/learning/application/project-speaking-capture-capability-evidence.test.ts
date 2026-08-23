import { describe, expect, it } from "vitest";

import { learningSpeakingAttemptSchema } from "@/shared/contracts/learning-speaking";
import { projectSpeakingCaptureCapabilityEvidence } from "./project-speaking-capture-capability-evidence";

describe("projectSpeakingCaptureCapabilityEvidence", () => {
  it("records real speaking participation without claiming objective success", () => {
    const attempt = learningSpeakingAttemptSchema.parse({
      id: "11111111-1111-4111-8111-111111111111",
      sessionId: "22222222-2222-4222-8222-222222222222",
      activityId: "activity_transfer",
      idempotencyKey: "33333333-3333-4333-8333-333333333333",
      durationMs: 3200,
      byteCount: 12000,
      mimeType: "audio/webm;codecs=opus",
      replayed: true,
      confirmedAudibleSpeech: true,
      createdAt: "2026-08-23T15:30:00.000Z",
    });

    expect(projectSpeakingCaptureCapabilityEvidence(attempt)).toEqual({
      subject: { kind: "activity", key: "activity_transfer" },
      targetSkill: "speaking",
      support: "supported",
      responseMode: "speaking",
      verification: "self_check",
      outcome: "unscored",
      evidenceKind: "speaking_capture",
      observedAt: "2026-08-23T15:30:00.000Z",
    });
  });
});
