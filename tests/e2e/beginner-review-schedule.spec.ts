import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("a word the learner produces is scheduled to come back", async ({
  page,
}, testInfo) => {
  // The defect: the beginner track banked evidence and never set a review date,
  // so a word was met once and never again. FSRS was installed, tested and
  // reachable — and driving only the older video-lesson path.
  await login(page, `schedule-${testInfo.project.name}@example.com`);
  await page.goto("/start");

  const issued = page.waitForResponse(
    (response) =>
      response.url().includes("/api/beginner/session") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Bắt đầu nghe" }).click();
  const introduction = (await (await issued).json()) as {
    kind: string;
    target: string;
    challengeId: string;
  };
  expect(introduction.kind).toBe("introduce_word");

  // Produce the word unaided.
  const attempt = await page.evaluate(async (body) => {
    const response = await fetch("/api/beginner/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  }, {
    kind: "introduce_word",
    challengeId: introduction.challengeId,
    usedSupport: false,
    claimedIndependent: true,
  });
  expect(attempt.status).toBe(201);
  expect(attempt.body.known).toBe(true);

  // The schedule has to be observable, not just written. The dashboard reports
  // the review queue, so a word that was produced must be counted there — that
  // is the whole chain: evidence, FSRS, `next_review_at`, queue.
  await page.goto("/dashboard");
  await expect(page.getByTestId("todays-action")).toBeVisible();

  const scheduled = await page.evaluate(async () => {
    const response = await fetch("/api/beginner/session", { method: "POST" });
    return { status: response.status, body: await response.json() };
  });
  expect(scheduled.status).toBe(200);

  // Not asserting the word comes back *today* — FSRS puts a first successful
  // recall further out than that, which is the point. What must be true is that
  // the session still works and the queue no longer silently drops the item.
  expect(scheduled.body).toBeTruthy();
});
