const DEFAULT_PAGE_SIZE = 1_000;

type SupabasePage<T> = {
  data: T[] | null;
  error: unknown;
  count: number | null;
};

/**
 * Read a complete, deterministically ordered Supabase Data API result.
 *
 * Supabase applies a server-side maximum row count to each request. A query can
 * therefore succeed while returning only the first page. Requiring an exact
 * count lets this helper keep paging even when the server cap is lower than the
 * requested range, and fail closed if the result ends early.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<SupabasePage<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error("Supabase page size must be a positive integer.");
  }

  const rows: T[] = [];
  let expectedCount: number | null = null;
  let from = 0;

  for (;;) {
    const page = await fetchPage(from, from + pageSize - 1);
    if (page.error) throw page.error;

    if (expectedCount === null && typeof page.count === "number") {
      expectedCount = page.count;
    }

    const pageRows = page.data ?? [];
    rows.push(...pageRows);

    if (expectedCount !== null && rows.length >= expectedCount) {
      return rows.slice(0, expectedCount);
    }

    if (pageRows.length === 0) {
      if (expectedCount !== null && rows.length < expectedCount) {
        throw new Error(
          `Supabase pagination ended at ${rows.length} of ${expectedCount} rows.`,
        );
      }
      return rows;
    }

    // Advance by what the server actually returned, not what was requested.
    // This remains correct when the project max_rows cap is below pageSize.
    from += pageRows.length;

    // Exact count should be present because callers request it. Keep a safe
    // fallback for adapters/fakes that do not expose count.
    if (expectedCount === null && pageRows.length < pageSize) {
      return rows;
    }
  }
}
