import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Proves that application modules are reachable from something that runs.
 *
 * This repository has now shipped the same failure five times: a module is
 * written, exported and unit-tested, and no route or workflow ever calls it.
 * Unit tests pass, CI is green, and the behaviour the module describes has
 * never once executed. `learning_item_states` carried a due index for weeks
 * with nothing writing to it; `prepare-learning-authoring-brief` is 837 lines
 * of diagnosis and candidate gating that no entry point can reach.
 *
 * Unit tests cannot catch this by construction — a test importing a module is
 * exactly what makes it look used. Only reachability from a real entry point
 * separates product behaviour from a well-tested library nobody calls.
 *
 * Known limit: this works at file granularity. A file counts as reached when
 * anything imports any part of it, so a dead function inside a live file still
 * slips through — `schedule-item-review.ts` is reached today only because one
 * caller imports its version constant, while `scheduleItemReviews` itself has
 * no caller. Catching that needs export-level analysis, which this is not.
 */

const SRC = "src";

/**
 * Modules that are deliberately not wired yet, each with the reason.
 *
 * This list is the backlog, written down. An entry here is a claim that the
 * module does not run today — so the test also fails when a listed module
 * becomes reachable, which stops the list from quietly rotting into a lie.
 */
const NOT_YET_WIRED: Record<string, string> = {
  "src/modules/session/application/plan-daily-session.ts":
    "The daily session — review, then read, then build — as one ordered run " +
    "sized to the thirty minutes the learner said he has. Written after the " +
    "product owner called the site a jumble of eight doors. The navigation is " +
    "already collapsed to five; the session that replaces the menu still has " +
    "no surface running it.",

  // This list is self-cleaning: an entry has to leave the moment a route
  // reaches it, so it cannot quietly describe a past that is over. The four
  // A0 modules that used to sit here left when /start shipped, which is the
  // only evidence that matters that they are no longer inert.
};

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listSourceFiles(full));
      continue;
    }
    if (!/\.tsx?$/.test(entry) || entry.includes(".test.")) continue;
    out.push(path.normalize(full));
  }
  return out;
}

const FILES = listSourceFiles(SRC);
const KNOWN = new Set(FILES);

/** Resolves an import specifier to a file in this repo, or null if external. */
function resolve(specifier: string, fromDir: string): string | null {
  let base: string;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.join(fromDir, specifier);
  else return null;

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ]) {
    const normalized = path.normalize(candidate);
    if (KNOWN.has(normalized)) return normalized;
  }
  return null;
}

const IMPORT_PATTERN = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const dir = path.dirname(file);
  const found: string[] = [];
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const target = resolve(match[1]!, dir);
    if (target) found.push(target);
  }
  return found;
}

/**
 * Anything the runtime itself invokes: Next.js route handlers, pages and
 * layouts, plus workflow entry points. Nothing else starts on its own.
 */
const ENTRY_POINTS = FILES.filter(
  (file) =>
    (file.includes(`${path.sep}app${path.sep}`) &&
      /(?:page|route|layout|middleware)\.tsx?$/.test(file)) ||
    file.startsWith(path.normalize("src/workflows/")),
);

function reachableFromEntryPoints(): Set<string> {
  const seen = new Set<string>();
  const stack = [...ENTRY_POINTS];
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const next of importsOf(file)) {
      if (!seen.has(next)) stack.push(next);
    }
  }
  return seen;
}

const REACHABLE = reachableFromEntryPoints();

const APPLICATION_MODULES = FILES.filter((file) =>
  /modules[\\/][^\\/]+[\\/]application[\\/][^\\/]+\.ts$/.test(file),
);

describe("application module reachability", () => {
  it("finds entry points and application modules at all", () => {
    // If either sweep came back empty the assertions below would pass by
    // vacuum, which is the same silence this test exists to break.
    expect(ENTRY_POINTS.length).toBeGreaterThan(10);
    expect(APPLICATION_MODULES.length).toBeGreaterThan(10);
  });

  it("reaches every application module that is not declared unwired", () => {
    const orphans = APPLICATION_MODULES.filter(
      (file) => !REACHABLE.has(file) && !(file in NOT_YET_WIRED),
    );
    expect(orphans).toEqual([]);
  });

  it("keeps the unwired list honest", () => {
    // A module that has since been wired must leave the list. Otherwise the
    // list drifts into describing a past that no longer exists, and the next
    // reader trusts it.
    const wiredButStillListed = Object.keys(NOT_YET_WIRED).filter((file) =>
      REACHABLE.has(path.normalize(file)),
    );
    expect(wiredButStillListed).toEqual([]);
  });

  it("lists only modules that exist", () => {
    const missing = Object.keys(NOT_YET_WIRED).filter(
      (file) => !KNOWN.has(path.normalize(file)),
    );
    expect(missing).toEqual([]);
  });

  it("proves the scheduler actually runs", () => {
    // The point of the whole exercise: spaced repetition is only real if the
    // path from a route to the scheduler exists.
    expect(
      REACHABLE.has(
        path.normalize("src/modules/learning/application/review-scheduler.ts"),
      ),
    ).toBe(true);
  });
});
