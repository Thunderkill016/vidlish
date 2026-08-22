import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("a learner starting from zero hears a sentence and their evidence is kept", async ({
  page,
}, testInfo) => {
  // A per-project email, or the two Playwright projects share one learner and
  // the second one starts with words the first taught.
  await login(page, `beginner-${testInfo.project.name}@example.com`);

  await page.goto("/start");
  await expect(page.getByRole("heading", { name: "Bắt đầu từ số 0" })).toBeVisible();

  // Nothing has been produced unaided yet, so the count that decides what comes
  // next is zero — not a session count, not a streak.
  const known = page.getByText("Số từ bạn đã tự nói ra được, không mở trợ giúp");
  await expect(known).toBeVisible();

  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();

  // At zero known words no sentence can satisfy i+1, so the first word arrives
  // on its own. This is arithmetic, not a missing feature.
  await expect(
    page.getByText("Từ đầu tiên không đến trong một câu"),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "Nói được", exact: true }).click();
  // The confirmation only appears once the save has come back. It used to
  // appear immediately, which meant a learner who closed the tab was told they
  // had made progress the next session could not see.
  await expect(page.getByText(/Đã ghi lại/)).toBeVisible();

  // The evidence has to survive a reload, or nothing decided the next word.
  await page.reload();
  await expect(known).toBeVisible();
  await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
});
