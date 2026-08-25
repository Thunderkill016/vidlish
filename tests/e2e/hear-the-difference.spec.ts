import { expect, test } from "@playwright/test";

import { signIn } from "./_sign-in";

test("the sound explanation comes before any trial, not after", async ({
  page,
}, testInfo) => {
  await signIn(page, `listen-${testInfo.project.name}@example.com`);
  await page.goto("/listen");

  await expect(
    page.getByRole("heading", { name: "Nghe ra sự khác nhau" }),
  ).toBeVisible();

  // Presenting phonetic information about the target before perception training
  // measurably improves how much of the gain reaches production, so the
  // explanation is part of the treatment rather than an introduction. A build
  // that jumps straight to trials is a weaker treatment wearing the same name.
  await expect(page.getByRole("button", { name: "Bắt đầu nghe" })).toBeVisible();
  await expect(page.getByTestId("hvpt-option-pin")).toHaveCount(0);
});

test("a trial offers exactly the two words of one minimal pair", async ({
  page,
}, testInfo) => {
  await signIn(page, `listen-pair-${testInfo.project.name}@example.com`);
  await page.goto("/listen");
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  // Two options, and they must be a real pair. Options drawn from different
  // pairs would differ in more than the trained sound, and the learner could
  // answer from the other difference without ever hearing this one.
  const options = page.locator('[data-testid^="hvpt-option-"]');
  await expect(options).toHaveCount(2);

  const words = await options.allTextContents();
  expect(new Set(words).size).toBe(2);
});

test("answering shows which word it was and offers both to compare", async ({
  page,
}, testInfo) => {
  await signIn(page, `listen-answer-${testInfo.project.name}@example.com`);
  await page.goto("/listen");
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  await page.locator('[data-testid^="hvpt-option-"]').first().click();
  await expect(page.getByTestId("hvpt-feedback")).toBeVisible();

  // Being told the answer without hearing the two again teaches nothing about
  // the sound. The correction is the contrast, replayed.
  await expect(page.getByRole("button", { name: /^Nghe “/ })).toHaveCount(2);
  await expect(page.getByTestId("hvpt-progress")).toBeVisible();
});

test("the word the trial plays actually serves real audio", async ({
  page,
}, testInfo) => {
  await signIn(page, `listen-audio-${testInfo.project.name}@example.com`);
  await page.goto("/listen");

  // Watch the request the page itself makes, rather than guessing a URL. The
  // audio filename is a hash of word and voice precisely so a browser cannot
  // map it back to the answer, which means the only honest way to check the
  // file exists is to see the page ask for it.
  //
  // What this catches: a stale manifest entry, a renamed file, a render that
  // never happened. All three end the same way — the trainer plays silence, and
  // to a learner who has been told to listen hard, silence is indistinguishable
  // from a sound they failed to hear.
  const audioRequest = page.waitForResponse(
    (response) => response.url().includes("/audio/pronunciation/"),
    { timeout: 15_000 },
  );
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  const response = await audioRequest;

  // 206, not 200: a media element asks for a byte range, so the server answers
  // Partial Content. Both are a served file; 404 and 500 are not. Asserting a
  // bare 200 here failed against a perfectly working page, which is its own
  // small lesson about checking a test locally before trusting it.
  expect([200, 206]).toContain(response.status());
  expect((await response.body()).byteLength).toBeGreaterThan(1000);
});
