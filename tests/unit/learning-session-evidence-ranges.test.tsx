// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LearningSessionLab } from "@/app/(protected)/learning-lab/v2/_components/learning-session-lab";
import { createGoldenSessionLearningBlueprint } from "@/adapters/fake/fixture-golden-learning-blueprint";
import { createFixtureLearningMedia } from "@/adapters/fake/fixture-learning-media";
import { fixtureLearningSupportCopy } from "@/adapters/fake/fixture-learning-runtime-policy";
import { createLearnerBlueprintView } from "@/modules/learning/application/create-learner-blueprint-view";
import { deriveLearningRuntimePolicy } from "@/modules/learning/application/derive-learning-runtime-policy";
import { bindVerifiedLearningMedia } from "@/shared/contracts/learning-media";
import type { LessonBlueprintV2 } from "@/shared/contracts/lesson-v2";

/**
 * VLR-101. An activity may cite two source windows — the contract allows it and
 * the authoring draft can produce it. Only the first was ever playable: the
 * second was hydrated, shown as a citation, and unreachable.
 *
 * A gist question resting on a passage the learner cannot play is unanswerable
 * by listening, which is the one thing the activity claims to measure.
 */

/** The Golden lesson with its gist activity citing both of its windows. */
function twoWindowBlueprint(): LessonBlueprintV2 {
  const blueprint = createGoldenSessionLearningBlueprint();
  const gist = blueprint.activities[0]!;
  const [first] = gist.evidence;
  if (!first) throw new Error("Fixture gist activity has no evidence.");

  const [one, two] = blueprint.evidenceCatalog;
  if (!one || !two) throw new Error("Fixture has fewer than two evidence entries.");

  // Each range must match its canonical segments exactly — the media binder
  // rejects a range broader or narrower than what it cites, which is the guard
  // that keeps a player from seeking into speech nobody permitted.
  const range = (entry: typeof one) => ({
    sourceSegmentIds: [entry.segmentId],
    startMs: entry.startMs,
    endMs: entry.endMs,
    captionPolicy: first.captionPolicy,
    replayAllowed: true as const,
  });

  return {
    ...blueprint,
    activities: [
      { ...gist, evidence: [range(one), range(two)] },
      ...blueprint.activities.slice(1),
    ],
  } as LessonBlueprintV2;
}

/**
 * The session route, stubbed. This test is about which source ranges the lesson
 * makes playable, so the only thing it needs from the server is a session that
 * opens; letting the real fetch fail would leave the activity unrendered and
 * the assertions vacuous.
 */
function stubSessionRoute(blueprint: LessonBlueprintV2) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/learning-lab/v2/sessions")) {
        return new Response(
          JSON.stringify({
            created: true,
            session: {
              id: "33333333-3333-4333-8333-333333333333",
              ownerUserId: "44444444-4444-4444-8444-444444444444",
              lessonVersionId: "55555555-5555-4555-8555-555555555555",
              status: "in_progress",
              currentPhase: blueprint.activities[0]!.phase,
              currentActivityId: blueprint.activities[0]!.id,
              startedAt: "2026-08-20T00:00:00+00:00",
              completedAt: null,
              updatedAt: "2026-08-20T00:00:00+00:00",
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        );
      }
      throw new Error(`Unexpected request in this test: ${url}`);
    }),
  );
}

function renderLab(blueprint: LessonBlueprintV2) {
  return render(
    <LearningSessionLab
      blueprint={createLearnerBlueprintView(blueprint)}
      media={bindVerifiedLearningMedia(blueprint, createFixtureLearningMedia())}
      policy={deriveLearningRuntimePolicy(blueprint)}
      supportCopy={fixtureLearningSupportCopy}
    />,
  );
}

describe("an activity citing two source windows", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers both ranges, not only the first", async () => {
    const blueprint = twoWindowBlueprint();
    stubSessionRoute(blueprint);
    renderLab(blueprint);
    // The lab restores any saved session before it renders anything, so the
    // start control only exists after that pass.
    await userEvent.click(
      await screen.findByRole("button", { name: "Bắt đầu nghe không phụ đề" }),
    );

    const ranges = screen.getByRole("group", {
      name: "Đoạn nguồn của hoạt động này",
    });
    expect(ranges).toBeDefined();
    expect(
      within(ranges).getAllByRole("button").length,
    ).toBe(blueprint.activities[0]!.evidence.length);
  });

  it("binds the player to whichever range the learner selects", async () => {
    const blueprint = twoWindowBlueprint();
    const [, second] = blueprint.activities[0]!.evidence;
    stubSessionRoute(blueprint);
    renderLab(blueprint);
    // The lab restores any saved session before it renders anything, so the
    // start control only exists after that pass.
    await userEvent.click(
      await screen.findByRole("button", { name: "Bắt đầu nghe không phụ đề" }),
    );

    const ranges = screen.getByRole("group", {
      name: "Đoạn nguồn của hoạt động này",
    });
    const secondButton = within(ranges).getAllByRole("button")[1]!;
    await userEvent.click(secondButton);

    expect(secondButton.getAttribute("aria-pressed")).toBe("true");
    // The heading above the player is what the learner reads as "this is the
    // passage you are about to hear", so it has to follow the selection.
    expect(
      screen.getByText(formatRange(second!.startMs, second!.endMs)),
    ).toBeDefined();
  });

  it("offers no range picker when the activity cites one window", async () => {
    // The Golden lesson as authored. A picker with a single option is noise.
    const golden = createGoldenSessionLearningBlueprint();
    stubSessionRoute(golden);
    renderLab(golden);
    // The lab restores any saved session before it renders anything, so the
    // start control only exists after that pass.
    await userEvent.click(
      await screen.findByRole("button", { name: "Bắt đầu nghe không phụ đề" }),
    );

    expect(
      screen.queryByRole("group", { name: "Đoạn nguồn của hoạt động này" }),
    ).toBeNull();
  });
});

function formatRange(startMs: number, endMs: number): string {
  const time = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };
  return `${time(startMs)}–${time(endMs)}`;
}
