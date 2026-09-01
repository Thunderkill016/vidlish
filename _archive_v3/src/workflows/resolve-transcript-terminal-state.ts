import "server-only";

import { createGenerationRepository } from "@/platform/generation/create-generation-runtime";
import { emitGenerationEvent } from "@/shared/observability/generation-event";
import type { GenerationWorkflowJobRef } from "./generate-lesson.steps";

export type TranscriptTerminalReason =
  | "TRANSCRIPT_EVIDENCE_TOO_WEAK"
  | "NO_USABLE_TRANSCRIPT";

/**
 * Final workflow safety boundary for transcript acquisition.
 *
 * A workflow must never return while the job still occupies an active
 * transcript state. This resolver deliberately bypasses strategy routing: it is
 * called only when the current workflow execution is about to finish and no
 * further acquisition step will run.
 */
export async function resolveTranscriptTerminalStateStep(
  jobRef: GenerationWorkflowJobRef,
  reason: TranscriptTerminalReason,
) {
  "use step";

  const generationRepository = createGenerationRepository();
  const latest = await generationRepository.findOwnedById(
    jobRef.jobId,
    jobRef.ownerUserId,
  );

  if (!latest) return { kind: "missing" } as const;
  if (
    latest.status === "completed" ||
    latest.status === "failed" ||
    latest.status === "cancelled"
  ) {
    return { kind: "already_settled" } as const;
  }

  await generationRepository.markTranscriptExhausted(
    latest.id,
    latest.ownerUserId,
    reason,
  );

  emitGenerationEvent({
    level: "warning",
    jobId: jobRef.jobId,
    stage: "workflow_terminalization",
    action: "succeeded",
    provider: "workflow",
    outcome: "terminated",
  });

  return { kind: "terminated" } as const;
}

resolveTranscriptTerminalStateStep.maxRetries = 5;
