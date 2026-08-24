import { describe, expect, it } from "vitest";
import { foundationUnitById } from "../content";
import { pendingUnitActivities } from "./pending-unit-activities";

const unit = foundationUnitById("pre-a1-introduce-yourself")!;

describe("pendingUnitActivities", () => {
  it("offers every activity while the learner can produce none of the language", () => {
    expect(pendingUnitActivities(unit, new Set())).toHaveLength(
      unit.activities.length,
    );
  });

  it("drops an activity once every chunk it practises is produced unaided", () => {
    const known = new Set(["my name is"]);
    const pending = pendingUnitActivities(unit, known);

    // The activity that practises only "my name is" is done; the ones that also
    // practise something else are not.
    expect(pending.map((activity) => activity.activityId)).not.toContain(
      "recall-say-your-name",
    );
    expect(pending.map((activity) => activity.activityId)).toContain(
      "use-meet-someone",
    );
  });

  it("matches chunks case-insensitively", () => {
    expect(
      pendingUnitActivities(unit, new Set(["MY NAME IS"])).map(
        (activity) => activity.activityId,
      ),
    ).not.toContain("recall-say-your-name");
  });

  it("offers nothing once the whole unit can be produced unaided", () => {
    const everything = new Set(
      unit.targetChunks.map((chunk) => chunk.text.toLocaleLowerCase("en-US")),
    );
    expect(pendingUnitActivities(unit, everything)).toEqual([]);
  });
});
