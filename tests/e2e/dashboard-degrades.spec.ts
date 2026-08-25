import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

// The fault has to exist when the dev server boots, so this spec is run on its
// own with `FAKE_SPEAKING_QUEUE_FAULT=missing_table` (see the CI workflow).
// Skipping without it keeps the main run honest rather than asserting against a
// server that was never faulted; CI always runs it, so it cannot rot unnoticed.
test.skip(
  process.env.FAKE_SPEAKING_QUEUE_FAULT !== "missing_table",
  "run with FAKE_SPEAKING_QUEUE_FAULT=missing_table",
);

test("the home page survives a panel whose table is missing", async ({
  page,
}, testInfo) => {
  // This is the exact production failure: `learning_speaking_attempts` had
  // never been migrated, the speaking-queue read threw, and the learner saw
  // "This page couldn't load" with no way in — because a widget they had never
  // used could not read its table.
  await login(page, `degrade-${testInfo.project.name}@example.com`);

  const response = await page.goto("/dashboard");
  expect(response?.status()).toBe(200);

  // The rest of the page still works — the library, the progress figures, the
  // review schedule all render.
  await expect(page.getByRole("heading", { name: "Hôm nay học gì?" })).toBeVisible();

  // "Today's action" is itself derived from the broken read, so it says it
  // cannot tell. It must not fall back to "nothing due today": the learner
  // would read that as being finished for the day.
  await expect(page.getByTestId("todays-action-unavailable")).toBeVisible();
  await expect(page.getByTestId("todays-action")).toHaveCount(0);

  // And the failure is shown, not hidden. A page that silently drops a panel
  // teaches the learner to trust something that is not there.
  const notice = page.getByTestId("dashboard-degraded");
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("hàng chờ luyện nói");
});
