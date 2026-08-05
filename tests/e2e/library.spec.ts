import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("an empty library tells the learner where to start", async ({ page }) => {
  await login(page);
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

  // The library is the learner's way back to a lesson after they close the tab.
  await page.goto("/library");
  const shelf = page.getByTestId("lesson-library");
  await expect(shelf).toBeVisible();
  await expect(shelf.getByRole("link")).toHaveCount(1);

  await shelf.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/lessons\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Điền từ" })).toBeVisible();
});
