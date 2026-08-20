// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LearningSessionLab } from "@/app/(protected)/learning-lab/v2/_components/learning-session-lab";
import { createFixtureLearningMedia } from "@/adapters/fake/fixture-learning-media";
import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { fixtureLearningSupportCopy } from "@/adapters/fake/fixture-learning-runtime-policy";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { bindVerifiedLearningMedia } from "@/shared/contracts/learning-media";

/**
 * VLR-103. Support level is a claim about what help a learner was given, so the
 * durable record has to be what answers it.
 *
 * The browser used to be the only source of restored state. A learner returning
 * on another device — or after clearing storage, or in a private window — was
 * shown an untouched ladder while the server already held the caption they had
 * opened, and the ladder on screen was the one that disagreed with the record.
 */

const blueprint = createGoldenSessionLearningBlueprint();
const GIST = blueprint.activities[0]!.id;

function sessionResponse(progress: unknown[]) {
  return new Response(
    JSON.stringify({
      created: false,
      progress,
      session: {
        id: "33333333-3333-4333-8333-333333333333",
        ownerUserId: "44444444-4444-4444-8444-444444444444",
        lessonVersionId: "55555555-5555-4555-8555-555555555555",
        status: "in_progress",
        currentPhase: blueprint.activities[0]!.phase,
        currentActivityId: GIST,
        startedAt: "2026-08-20T00:00:00+00:00",
        completedAt: null,
        updatedAt: "2026-08-20T00:00:00+00:00",
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

function stubSessionRoute(progress: unknown[]) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input));
      const url = String(input);
      if (url.includes("/api/learning-lab/v2/sessions")) {
        return sessionResponse(progress);
      }
      throw new Error(`Unexpected request in this test: ${url}`);
    }),
  );
  return calls;
}

function renderLab() {
  return render(
    <LearningSessionLab
      blueprint={createLearnerBlueprintView(blueprint)}
      media={bindVerifiedLearningMedia(blueprint, createFixtureLearningMedia())}
      policy={deriveLearningRuntimePolicy(blueprint)}
      supportCopy={fixtureLearningSupportCopy}
    />,
  );
}

async function openSession() {
  await userEvent.click(
    await screen.findByRole("button", { name: "Bắt đầu nghe không phụ đề" }),
  );
}

describe("restoring support state on a device that has seen nothing", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not re-offer a support step the server already recorded", async () => {
    stubSessionRoute([
      {
        activityId: GIST,
        playbackCount: 2,
        attemptCount: 1,
        openedSupportSteps: ["context_hint"],
      },
    ]);
    renderLab();
    await openSession();

    // The hint is spent, so the ladder must move on rather than offer it again.
    expect(
      screen.queryByRole("button", { name: "Mở gợi ý ngữ cảnh" }),
    ).toBeNull();
    expect(
      await screen.findByRole("button", { name: "Mở phát chậm hơn" }),
    ).toBeDefined();
  });

  it("shows the help already given rather than an untouched ladder", async () => {
    stubSessionRoute([
      {
        activityId: GIST,
        playbackCount: 2,
        attemptCount: 1,
        openedSupportSteps: ["context_hint"],
      },
    ]);
    renderLab();
    await openSession();

    expect(await screen.findByText(/buổi hướng dẫn kỹ thuật/i)).toBeDefined();
  });

  it("counts server attempts when deciding what may be opened", async () => {
    // The English caption is a full reveal and sits behind an attempt. With no
    // attempt on this device, only the durable count can permit it — and it is
    // the last step, so reaching it at all proves the earlier ones are spent.
    stubSessionRoute([
      {
        activityId: GIST,
        playbackCount: 2,
        attemptCount: 1,
        openedSupportSteps: ["context_hint", "slower_playback"],
      },
    ]);
    renderLab();
    await openSession();

    await userEvent.click(
      await screen.findByRole("button", { name: "Mở phụ đề tiếng anh" }),
    );
    expect(
      screen.queryByText("Hãy thử trả lời trước khi mở mức hỗ trợ này."),
    ).toBeNull();
  });

  it("drops a ladder this device remembers when the record has none", async () => {
    // The other direction: stale local state must not keep showing help the
    // durable record cannot account for.
    window.localStorage.setItem(
      `vidlish:learning-lab:v4:${blueprint.blueprintId}`,
      JSON.stringify({
        version: 4,
        blueprintId: blueprint.blueprintId,
        sessionId: "33333333-3333-4333-8333-333333333333",
        started: true,
        completed: false,
        currentIndex: 0,
        progressByActivity: {
          [GIST]: {
            attempts: [],
            openedSupportSteps: ["context_hint"],
            playCount: 2,
            selfCheckConfirmed: false,
            selfCheckCorrectionRequested: false,
          },
        },
      }),
    );
    const calls = stubSessionRoute([]);
    renderLab();

    // The point of this test is that the browser asks at all, so wait for the
    // request rather than for a paint that could happen either way.
    await vi.waitFor(() => expect(calls.length).toBeGreaterThan(0));

    // No click: a restored session puts the learner straight back into the
    // activity, which is exactly the path that used to run on the browser's
    // memory alone. Reconciliation has to happen without being asked.
    //
    // With nothing on the record the learner is back at the foot of the ladder,
    // where replay is earned by listening twice rather than offered as a
    // button — so the hint text this device remembered must be gone.
    expect(
      await screen.findByText(/nhấn Phát đoạn lần thứ hai/i),
    ).toBeDefined();
    expect(screen.queryByText(/buổi hướng dẫn kỹ thuật/i)).toBeNull();
  });
});
