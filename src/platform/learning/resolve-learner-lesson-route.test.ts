import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The v1 page forwards to the v2 session; the v2 session sends the learner back
 * when it cannot render. Two pages, one question — and if they answer it
 * differently the learner bounces between them until the browser gives up.
 *
 * A blueprint with no transcript is exactly that case, and it is not
 * hypothetical: a job can publish a blueprint and lose its transcript, and the
 * session needs the transcript for the timings it plays.
 */
const findForJob = vi.fn();
const findCanonicalForJob = vi.fn();

vi.mock("@/platform/learning/create-learning-authoring-runtime", () => ({
  createLessonVersionRepository: () => ({ findForJob }),
}));
vi.mock("@/platform/generation/create-generation-runtime", () => ({
  createGenerationRepository: () => ({}),
}));
vi.mock("@/platform/transcript/create-transcript-runtime", () => ({
  createTranscriptRuntime: () => ({ repository: { findCanonicalForJob } }),
}));

const { resolveLearnerLessonRoute } = await import(
  "./resolve-learner-lesson-route"
);

const INPUT = {
  ownerUserId: "11111111-1111-4111-8111-111111111111",
  jobId: "22222222-2222-4222-8222-222222222222",
};

describe("resolveLearnerLessonRoute", () => {
  beforeEach(() => {
    findForJob.mockReset();
    findCanonicalForJob.mockReset();
  });

  it("sends the learner to the guided session when it can render", async () => {
    findForJob.mockResolvedValue({ blueprint: { schemaVersion: "lesson:v2" } });
    findCanonicalForJob.mockResolvedValue({ videoId: "M7lc1UVf-VE" });

    const route = await resolveLearnerLessonRoute(INPUT);
    expect(route.kind).toBe("v2");
  });

  it("stays on the reference lesson when no blueprint exists", async () => {
    findForJob.mockResolvedValue(null);

    const route = await resolveLearnerLessonRoute(INPUT);
    expect(route.kind).toBe("v1");
    // No point asking for a transcript once the answer is settled.
    expect(findCanonicalForJob).not.toHaveBeenCalled();
  });

  it("stays on the reference lesson when a blueprint has no transcript", async () => {
    // The bounce case. If this returned "v2" the session page would find no
    // transcript, send the learner back, and the v1 page would forward again.
    findForJob.mockResolvedValue({ blueprint: { schemaVersion: "lesson:v2" } });
    findCanonicalForJob.mockResolvedValue(null);

    const route = await resolveLearnerLessonRoute(INPUT);
    expect(route.kind).toBe("v1");
  });

  it("scopes both lookups to the owner", async () => {
    findForJob.mockResolvedValue({ blueprint: {} });
    findCanonicalForJob.mockResolvedValue({});

    await resolveLearnerLessonRoute(INPUT);
    expect(findForJob).toHaveBeenCalledWith(INPUT);
    expect(findCanonicalForJob).toHaveBeenCalledWith(INPUT.ownerUserId, INPUT.jobId);
  });
});
