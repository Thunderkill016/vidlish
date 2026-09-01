import { afterEach, describe, expect, it, vi } from "vitest";

import { panelValue, readPanel, unavailablePanels } from "./read-panel";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readPanel", () => {
  it("returns the value when the read succeeds", async () => {
    const read = await readPanel("reviews", async () => [1, 2, 3]);
    expect(read).toEqual({ kind: "ready", value: [1, 2, 3] });
  });

  it("contains a failure instead of letting it reach the page", async () => {
    // The dashboard used to load six independent things in one Promise.all, so
    // a missing table returned 500 for the whole page and the learner had no
    // way in at all.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const read = await readPanel("speaking", async () => {
      throw new Error("Could not find the table 'public.learning_speaking_attempts'");
    });
    expect(read.kind).toBe("unavailable");
    expect(read).toMatchObject({
      panel: "speaking",
      reason: expect.stringContaining("learning_speaking_attempts"),
    });
  });

  it("still reports the failure rather than swallowing it", async () => {
    // Containment is not silence. A failure nobody is told about is the thing
    // this codebase refuses to do.
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    await readPanel("speaking", async () => {
      throw new Error("boom");
    });
    expect(logged).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(logged.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      event: "vidlish_panel_unavailable",
      panel: "speaking",
      reason: "boom",
    });
  });

  it("gives the caller a fallback without pretending the read worked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const read = await readPanel<number[]>("reviews", async () => {
      throw new Error("no");
    });
    expect(panelValue(read, [])).toEqual([]);
    expect(unavailablePanels([read])).toEqual([
      { panel: "reviews", reason: "no" },
    ]);
  });

  it("names every panel that failed, not just the first", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reads = await Promise.all([
      readPanel("a", async () => {
        throw new Error("x");
      }),
      readPanel("b", async () => 1),
      readPanel("c", async () => {
        throw new Error("y");
      }),
    ]);
    expect(unavailablePanels(reads).map((p) => p.panel)).toEqual(["a", "c"]);
  });

  it("does not retry a failure that cannot change", async () => {
    // A missing table is not present on a second attempt; retrying only makes
    // the page slower to fail.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const read = vi.fn(async () => {
      throw new Error("missing table");
    });
    await readPanel("speaking", read);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
