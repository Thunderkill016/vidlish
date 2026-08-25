import "server-only";

/**
 * Reads the data for one panel of a page, so one failure cannot take the page.
 *
 * The learner's home page loaded six independent things in a single
 * `Promise.all`. When one table was missing from the database the whole page
 * returned 500 — the learner saw "This page couldn't load" and had no way in,
 * because a speaking-review widget they had never used could not read its
 * table. Six reads, one shared fate.
 *
 * This is containment, not silence. The rule the codebase holds — do not
 * swallow errors — is about hiding a failure so nobody learns of it. Here the
 * failure is logged as a structured event *and* rendered on the page as an
 * unavailable panel, so both the learner and the next reader of the logs know
 * exactly which part broke and why. What it refuses to do is let that one part
 * decide whether the other five are allowed to exist.
 *
 * It deliberately does not retry. A missing table does not become present on a
 * second attempt, and retrying would only make the page slower to fail.
 */

export type PanelRead<T> =
  | { readonly kind: "ready"; readonly value: T }
  | { readonly kind: "unavailable"; readonly panel: string; readonly reason: string };

export async function readPanel<T>(
  panel: string,
  read: () => Promise<T>,
): Promise<PanelRead<T>> {
  try {
    return { kind: "ready", value: await read() };
  } catch (error) {
    const reason = describe(error);
    // Structured so it can be searched in the platform's logs by panel name,
    // which is the question anyone debugging this actually asks.
    console.error(
      JSON.stringify({
        event: "vidlish_panel_unavailable",
        level: "error",
        panel,
        reason,
      }),
    );
    return { kind: "unavailable", panel, reason };
  }
}

/** The value when a panel could not be read. */
export function panelValue<T>(read: PanelRead<T>, fallback: T): T {
  return read.kind === "ready" ? read.value : fallback;
}

/** Every panel that failed, for the page to show rather than hide. */
export function unavailablePanels(
  reads: readonly PanelRead<unknown>[],
): { panel: string; reason: string }[] {
  return reads
    .filter(
      (read): read is Extract<PanelRead<unknown>, { kind: "unavailable" }> =>
        read.kind === "unavailable",
    )
    .map(({ panel, reason }) => ({ panel, reason }));
}

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "unknown error";
  }
}
