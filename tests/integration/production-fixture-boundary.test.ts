import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Keeps fixtures out of the paths that grade a learner and write their record.
 *
 * VLR-001 and VLR-002: the attempt and support routes resolved a demo blueprint
 * regardless of which lesson the learner had open. A learner could study a
 * blueprint generated from their own video while the server graded them against
 * a fixture — same activity ids by coincidence, different content, and every
 * persisted attempt recorded against the wrong lesson. Nothing failed loudly;
 * the two simply agreed often enough to look correct.
 *
 * A grep is the right shape of test here. The defect was not a wrong value at
 * runtime but an import that should never have been reachable from these files,
 * and an import is exactly what a grep can hold.
 */

const API_ROOT = path.normalize("src/app/api");

const FIXTURE_IMPORT = /@\/adapters\/fake\//;

/**
 * The one route allowed to reach a fixture, and only to open the demo lab that
 * has no learner lesson behind it. It writes a session, so it is listed by name
 * rather than by pattern — a second file must not join it silently.
 */
const DEMO_LAB_ROUTE = path.normalize(
  "src/app/api/learning-lab/v2/sessions/route.ts",
);

/**
 * Routes still bound to a fixture, each with the plan item that closes it.
 *
 * This list is the backlog written down, and it is self-cleaning: a route that
 * stops importing a fixture must leave the list, so it cannot drift into
 * describing a past that no longer exists.
 */
const KNOWN_FIXTURE_BOUND: Record<string, string> = {
  "src/app/api/learning-lab/v2/reviews/sessions/route.ts":
    "VLR-003. The delayed-review resolver understands one hard-coded item, so " +
    "a review plan can only be built for that one. Every durable reviewable " +
    "item needs a bounded plan derived from persisted lesson evidence.",
  "src/app/api/learning-lab/v2/reviews/attempts/route.ts": "VLR-003, as above.",
};

function listRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listRoutes(full));
      continue;
    }
    if (entry === "route.ts") out.push(path.normalize(full));
  }
  return out;
}

const ROUTES = listRoutes(API_ROOT);

describe("production API fixture boundary", () => {
  it("finds the API routes at all", () => {
    // Without this the assertions below would pass on an empty sweep, which is
    // the same silence the guard exists to break.
    expect(ROUTES.length).toBeGreaterThan(5);
  });

  it("keeps fixtures out of every route but the demo lab", () => {
    const offenders = ROUTES.filter(
      (route) =>
        route !== DEMO_LAB_ROUTE &&
        !(route in KNOWN_FIXTURE_BOUND) &&
        FIXTURE_IMPORT.test(readFileSync(route, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the known-fixture list honest", () => {
    // A route that has been freed must leave the list, or the list becomes a
    // claim about the past rather than about the code.
    const freed = Object.keys(KNOWN_FIXTURE_BOUND).filter(
      (route) => !FIXTURE_IMPORT.test(readFileSync(path.normalize(route), "utf8")),
    );
    expect(freed).toEqual([]);
  });

  it("still catches a fixture import where one exists", () => {
    // A regex that matched nothing would make the assertion above pass forever.
    expect(
      FIXTURE_IMPORT.test(
        'import { x } from "@/adapters/fake/fixture-golden-learning-blueprint";',
      ),
    ).toBe(true);
  });
});
