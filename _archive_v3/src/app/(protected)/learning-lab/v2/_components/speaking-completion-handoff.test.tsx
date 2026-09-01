// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SpeakingCompletionHandoff } from "./speaking-completion-handoff";

const BLUEPRINT_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

function storeState(value: Record<string, unknown>) {
  window.localStorage.setItem(
    `vidlish:learning-lab:v4:${BLUEPRINT_ID}`,
    JSON.stringify({
      version: 4,
      blueprintId: BLUEPRINT_ID,
      sessionId: SESSION_ID,
      started: true,
      currentIndex: 4,
      progressByActivity: {},
      ...value,
    }),
  );
}

describe("SpeakingCompletionHandoff", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not advertise speaking before the lesson UI has completed", async () => {
    storeState({ completed: false });
    render(<SpeakingCompletionHandoff blueprintId={BLUEPRINT_ID} />);

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Nói lại bằng giọng thật" }),
      ).toBeNull();
    });
  });

  it("links the exact completed session into speaking practice", async () => {
    storeState({ completed: true });
    render(<SpeakingCompletionHandoff blueprintId={BLUEPRINT_ID} />);

    const link = await screen.findByRole("link", {
      name: "Nói lại bằng giọng thật",
    });
    expect(link.getAttribute("href")).toBe(
      `/learning-lab/v2/speaking?session=${SESSION_ID}`,
    );
  });

  it("ignores a completed state belonging to another blueprint", async () => {
    window.localStorage.setItem(
      `vidlish:learning-lab:v4:${BLUEPRINT_ID}`,
      JSON.stringify({
        version: 4,
        blueprintId: "33333333-3333-4333-8333-333333333333",
        sessionId: SESSION_ID,
        completed: true,
      }),
    );
    render(<SpeakingCompletionHandoff blueprintId={BLUEPRINT_ID} />);

    await waitFor(() => {
      expect(
        screen.queryByRole("link", { name: "Nói lại bằng giọng thật" }),
      ).toBeNull();
    });
  });
});
