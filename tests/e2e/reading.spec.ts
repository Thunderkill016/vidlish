import { expect, test } from "@playwright/test";

import { signIn } from "./_sign-in";

test("the shelf says where the learner stands before they open anything", async ({
  page,
}, testInfo) => {
  await signIn(page, `read-shelf-${testInfo.project.name}@example.com`);
  await page.goto("/read");

  await expect(page.getByRole("heading", { name: "Tiếng Anh thật, có phao" })).toBeVisible();
  // Grouped by topic on purpose: consecutive texts on one theme recycle
  // low-frequency words, and repetition is the scarce resource.
  await expect(page.getByRole("heading", { name: "Máy tính và phần mềm" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Đọc bài này →" }).first()).toBeVisible();
});

test("a word carries its status, and tapping it gives a Vietnamese meaning", async ({
  page,
}, testInfo) => {
  await signIn(page, `read-word-${testInfo.project.name}@example.com`);
  await page.goto("/read");
  await page.getByRole("link", { name: "Đọc bài này →" }).first().click();

  await expect(page.getByTestId("reading-coverage")).toBeVisible();
  await expect(page.getByTestId("reading-paragraph").first()).toBeVisible();

  // The gloss must appear at the word, never in a margin: separating a word
  // from its meaning splits attention and costs comprehension.
  const gloss = page.getByTestId("reading-gloss");
  await expect(gloss).toHaveCount(0);
  await page.locator('[data-testid^="reading-word-"]').first().click();
  await expect(gloss).toHaveCount(1);

  const word = page.locator('[data-testid^="reading-word-"]').first();
  await expect(word.locator('[data-testid="reading-gloss"]')).toBeVisible();
});

test("the text says where it came from, because its licence requires it", async ({
  page,
}, testInfo) => {
  await signIn(page, `read-licence-${testInfo.project.name}@example.com`);
  await page.goto("/read");
  await page.getByRole("link", { name: "Đọc bài này →" }).first().click();

  await expect(
    page.getByRole("link", { name: /Simple English Wikipedia/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Creative Commons Attribution-Share Alike/ }),
  ).toBeVisible();
});

test("reading is reachable from the phone's bottom bar", async ({ page }, testInfo) => {
  // The bar is `lg:hidden`, so on a desktop viewport its links are not in the
  // accessibility tree at all. Pin a phone size — this test is about the phone.
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, `read-nav-${testInfo.project.name}@example.com`);
  await page.goto("/dashboard");

  const mobileNav = page.getByRole("navigation", {
    name: "Điều hướng chính trên di động",
  });
  // Still five. Reading took the slot the video library gave up; the library is
  // one tap away from the daily home instead.
  await expect(mobileNav.getByRole("link")).toHaveCount(5);
  await expect(mobileNav.getByRole("link", { name: "Đọc" })).toBeVisible();
  await expect(page.getByTestId("library-entry")).toBeVisible();
});

test("a word tapped while reading can be put on the review calendar", async ({
  page,
}, testInfo) => {
  await signIn(page, `read-enqueue-${testInfo.project.name}@example.com`);
  await page.goto("/read");
  await page.getByRole("link", { name: "Đọc bài này →" }).first().click();

  // Nothing to save until something has been met.
  await expect(page.getByTestId("reading-save")).toHaveCount(0);

  await page.locator('[data-testid^="reading-word-"]').first().click();
  await expect(page.getByTestId("reading-save")).toBeVisible();

  await page.getByRole("button", { name: "Đưa vào lịch ôn" }).click();
  // Reading finds a word; the schedule supplies the eight-plus encounters that
  // reading leaves to chance. If this write is silently lost, the learner is
  // told a word is coming back when it is not.
  await expect(page.getByTestId("reading-save-result")).toBeVisible();
});

test("the roadmap page actually shows the road", async ({ page }, testInfo) => {
  await signIn(page, `roadmap-${testInfo.project.name}@example.com`);
  await page.goto("/start");

  // The page was named "Lộ trình" and showed a heading, two counters and one
  // exercise. Thirty authored units existed and the learner could not see one.
  const roadmap = page.getByTestId("course-roadmap");
  await expect(roadmap).toBeVisible();
  expect(await roadmap.locator("li").count()).toBeGreaterThanOrEqual(30);

  // Exactly one unit is where the learner stands, so "where am I" has an answer.
  await expect(page.getByTestId("roadmap-unit-current")).toHaveCount(1);

  // A unit is named by what it makes you able to do, not by its grammar.
  await expect(roadmap.getByText(/^Bài 1 ·/)).toBeVisible();
});
