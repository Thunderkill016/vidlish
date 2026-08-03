import type { GenerationPolicySnapshot } from "@/modules/generation/ports/generation-job-repository";
import { generationErrors } from "@/shared/errors/product-error";

export type GenerationPolicyLimits = {
  maxActiveJobs: number;
  maxJobsPerDay: number;
  maxJobsPerMinute: number;
};

export class GenerationPolicy {
  constructor(private readonly limits: GenerationPolicyLimits) {}

  assertCanCreate(snapshot: GenerationPolicySnapshot): void {
    if (snapshot.activeJobCount >= this.limits.maxActiveJobs) {
      throw generationErrors.concurrencyLimit();
    }
    if (snapshot.jobsCreatedToday >= this.limits.maxJobsPerDay) {
      throw generationErrors.quotaExceeded();
    }
    if (snapshot.jobsCreatedLastMinute >= this.limits.maxJobsPerMinute) {
      throw generationErrors.rateLimited();
    }
  }
}
