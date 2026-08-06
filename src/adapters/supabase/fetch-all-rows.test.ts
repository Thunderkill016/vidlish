import { describe, expect, it } from "vitest";

import { fetchAllRows } from "./fetch-all-rows";

describe("fetchAllRows", () => {
  it("continues until the exact count when the server returns fewer rows than requested", async () => {
    const source = Array.from({ length: 1_149 }, (_, index) => ({ index }));
    const ranges: Array<[number, number]> = [];

    const rows = await fetchAllRows(async (from, to) => {
      ranges.push([from, to]);
      // Simulate a project row cap lower than the requested 1,000-row range.
      const cappedTo = Math.min(to, from + 599);
      return {
        data: source.slice(from, cappedTo + 1),
        error: null,
        count: source.length,
      };
    });

    expect(rows).toEqual(source);
    expect(ranges).toEqual([
      [0, 999],
      [600, 1_599],
    ]);
  });

  it("fails closed when Supabase reports more rows but a later page is empty", async () => {
    await expect(
      fetchAllRows(async (from) => ({
        data: from === 0 ? [{ index: 0 }] : [],
        error: null,
        count: 2,
      })),
    ).rejects.toThrow("Supabase pagination ended at 1 of 2 rows.");
  });
});
