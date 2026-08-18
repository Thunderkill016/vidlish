import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email = "invited@example.com") {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function createLesson(page: Page): Promise<string> {
  const url = page.getByLabel("Liên kết video YouTube");
  await url.fill("https://youtu.be/dQw4w9WgXcQ");
  // The form hydrates after the first paint; clicking before the typed value
  // has stuck submits an empty URL and the level step never appears.
  await expect(url).toHaveValue("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: "B1 Trung cấp" }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await page.getByRole("button", { name: "Tạo bài học" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/, { timeout: 120_000 });
  await expect(page.getByTestId("lesson-ready")).toBeVisible({ timeout: 120_000 });
  return page.url().split("/").pop() as string;
}

test("a learner answers a lesson and the work is still there after a reload", async ({
  page,
}) => {
  // Creating the lesson drives the whole pipeline before the study part starts.
  test.setTimeout(120_000);
  await login(page);
  const jobId = await createLesson(page);

  await page.goto(`/lessons/${jobId}`);

  // The activities are answered on the page, not revealed under a summary.
  const quiz = page.locator("#kiem-tra");
  await quiz.getByRole("button", { name: /Đáp án đúng/ }).first().click();
  await expect(quiz.getByText("Chính xác.").first()).toBeVisible();

  await page.getByRole("button", { name: "Đánh dấu đã thuộc" }).first().click();
  await expect(page.getByTestId("study-save-status").first()).toHaveText(
    "Đã lưu tiến độ",
    { timeout: 15_000 },
  );

  // Closing the tab must not throw the session away.
  await page.reload();
  await expect(page.locator("#kiem-tra").getByText("Chính xác.").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Đã thuộc" }).first()).toBeVisible();

  // Luyện nghe: the whole permitted transcript, one line at a time.
  const lines = page.getByTestId("transcript-lines");
  await expect(lines).toBeVisible();
  expect(await lines.locator("li").count()).toBeGreaterThan(0);

  // Hiding the text is the exercise; the timestamps stay so a line can still be
  // replayed while its wording is covered.
  await page.getByRole("button", { name: "Ẩn lời thoại để nghe trước" }).click();
  await expect(lines.getByRole("button", { name: "Hiện lời thoại" }).first()).toBeVisible();
  await expect(
    lines.locator("button[aria-label^='Nghe câu tại']").first(),
  ).toBeVisible();

  // The shelf answers "where was I?", not only "what did I make?".
  await page.goto("/library");
  const entry = page.getByTestId("lesson-library").locator(`a[href="/lessons/${jobId}"]`);
  await expect(entry).toHaveCount(1);
  await expect(entry.getByText(/Đang học \d+%/)).toBeVisible();
});
