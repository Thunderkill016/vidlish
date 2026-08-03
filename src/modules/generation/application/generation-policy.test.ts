import { describe, expect, it } from "vitest";

import { GenerationPolicy } from "@/modules/generation/application/generation-policy";
import type { GenerationPolicySnapshot } from "@/modules/generation/ports/generation-job-repository";

const limits = {
  maxActiveJobs: 2,
  maxJobsPerDay: 20,
  maxJobsPerMinute: 3,
};

function capturePolicyError(snapshot: GenerationPolicySnapshot): unknown {
  try {
    new GenerationPolicy(limits).assertCanCreate(snapshot);
    return undefined;
  } catch (error) {
    return error;
  }
}

describe("GenerationPolicy", () => {
  it("allows work below every configured boundary", () => {
    expect(
      capturePolicyError({
        activeJobCount: 1,
        jobsCreatedToday: 19,
        jobsCreatedLastMinute: 2,
      }),
    ).toBeUndefined();
  });

  it("blocks active concurrency before creating a new job", () => {
    expect(
      capturePolicyError({
        activeJobCount: 2,
        jobsCreatedToday: 2,
        jobsCreatedLastMinute: 1,
      }),
    ).toMatchObject({ code: "JOB_CONCURRENCY_LIMIT", retryable: true });
  });

  it("blocks the daily account quota", () => {
    expect(
      capturePolicyError({
        activeJobCount: 0,
        jobsCreatedToday: 20,
        jobsCreatedLastMinute: 0,
      }),
    ).toMatchObject({ code: "ACCOUNT_QUOTA_EXCEEDED", retryable: false });
  });

  it("blocks burst creation within the configured minute", () => {
    expect(
      capturePolicyError({
        activeJobCount: 0,
        jobsCreatedToday: 3,
        jobsCreatedLastMinute: 3,
      }),
    ).toMatchObject({ code: "RATE_LIMITED", retryable: true });
  });
});
