import { expect, test } from "@playwright/test";

async function login(
  page: import("@playwright/test").Page,
  email = "invited@example.com",
) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("an empty library tells the learner where to start", async ({ page }) => {
  // A learner who owns nothing. Reusing the main account would make this
  // assertion depend on whether another project already created a lesson.
  await login(page, "fresh@example.com");
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Bài học đã lưu" })).toBeVisible();
  await expect(page.getByText("Chưa có bài học nào")).toBeVisible();
  await expect(page.getByRole("link", { name: "Tạo bài học đầu tiên" })).toBeVisible();
});

test("a published lesson appears in the library and opens from it", async ({ page }) => {
  await login(page);

  await page.getByLabel("Liên kết video YouTube").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: "B1 Trung cấp" }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await page.getByRole("button", { name: "Tạo bài học" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/, { timeout: 120_000 });
  await expect(page.getByTestId("lesson-ready")).toBeVisible({ timeout: 120_000 });
  const jobId = page.url().split("/").pop() as string;

  // The library is the learner's way back to a lesson after they close the tab.
  await page.goto("/library");
  const shelf = page.getByTestId("lesson-library");
  await expect(shelf).toBeVisible();

  // Assert this lesson is on the shelf, not how many are — other specs create
  // lessons for the same learner, and the count is none of this test's business.
  const entry = shelf.locator(`a[href="/lessons/${jobId}"]`);
  await expect(entry).toHaveCount(1);
  await entry.click();
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Điền từ" })).toBeVisible();
});
