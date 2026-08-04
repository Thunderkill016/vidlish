import type { GenerationJob } from "@/shared/contracts/generation";

export type HostedGeneratedPolicyDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "STRATEGY_DISABLED" | "VIDEO_DURATION_UNKNOWN" | "VIDEO_TOO_LONG";
    };

export class HostedGeneratedTranscriptPolicy {
  constructor(
    private readonly limits: {
      enabled: boolean;
      maxVideoDurationMs: number;
    },
  ) {}

  evaluate(job: GenerationJob): HostedGeneratedPolicyDecision {
    if (!this.limits.enabled) {
      return { allowed: false, reason: "STRATEGY_DISABLED" };
    }
    if (job.durationMs === undefined) {
      return { allowed: false, reason: "VIDEO_DURATION_UNKNOWN" };
    }
    if (job.durationMs > this.limits.maxVideoDurationMs) {
      return { allowed: false, reason: "VIDEO_TOO_LONG" };
    }
    return { allowed: true };
  }
}
