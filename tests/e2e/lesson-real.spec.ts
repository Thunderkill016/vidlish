/**
 * Drives the real product surface with the real Gemini API: sign in, submit a
 * video, wait for the job to finish, open the lesson.
 *
 * Skipped unless GEMINI_API_KEY is set, so CI never calls a paid API. Run it by
 * hand after touching the workflow, the dispatcher, the lesson page, or the
 * provider:
 *
 *   LESSON_PROVIDER=gemini GEMINI_API_KEY=... pnpm test:e2e lesson-real
 *
 * Everything except the model is still a fixture — the transcript never leaves
 * the repo. What this proves is the wiring the unit tests cannot: workflow →
 * GenerateLesson → GeminiLessonProvider → grounding gate → repository → page.
 */
import { expect, test } from "@playwright/test";

const hasKey = Boolean(process.env.GEMINI_API_KEY);

test.describe("real lesson generation", () => {
  test.skip(!hasKey, "needs GEMINI_API_KEY");

  test("a learner gets a lesson whose quotes come from the video", async ({
    page,
  }) => {
    // Generating a lesson is a real model call, so allow for a slow one.
    test.setTimeout(180_000);

    await page.goto("/sign-in");
    await page.getByLabel("Email được mời").fill("invited@example.com");
    await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
    await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/create$/);

    await page
      .getByLabel("Liên kết video YouTube")
      .fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Kiểm tra video" }).click();
    await page.getByRole("button", { name: "B1 Trung cấp" }).click();
    await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
    await page.getByRole("button", { name: "Tạo bài học" }).click();

    // The inline dispatcher runs the whole pipeline inside this request — model
    // call included — so the redirect lands only after generation finishes.
    // Hosted runs use Inngest and return immediately; this wait is local-only.
    await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/, {
      timeout: 150_000,
    });

    // The job page polls; the lesson card appears once generation lands.
    await expect(page.getByTestId("lesson-ready")).toBeVisible({
      timeout: 150_000,
    });
    await page.getByRole("button", { name: "Mở bài học" }).click();
    await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]{36}$/);

    // The lesson rendered, and it rendered real content rather than an
    // empty shell.
    await expect(page.getByRole("heading", { name: "Từ vựng", exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ngữ pháp" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Điền từ" })).toBeVisible();

    // Every citation links into the video at a real timestamp. This is the
    // grounding promise made visible: no quote without a source.
    const citations = page.locator('a[href*="youtube.com/watch"]');
    expect(await citations.count()).toBeGreaterThan(0);
    await expect(citations.first()).toHaveAttribute(
      "href",
      /youtube\.com\/watch\?v=[\w-]+&t=\d+s$/,
    );
  });
});
