import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test.beforeEach(async ({ page }) => login(page));

test("valid short URL shows safe metadata preview", async ({ page }) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/dQw4w9WgXcQ?t=42");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  const preview = page.getByTestId("video-metadata-preview");
  await expect(preview).toContainText("How to build a better learning habit");
  await expect(preview).toContainText("Vidlish Test Channel");
  await expect(preview).toContainText("15:33");
});

test("invalid URL is rejected locally and can be corrected", async ({ page }) => {
  const input = page.getByLabel("Liên kết video YouTube");
  await input.fill("https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.getByRole("alert")).toContainText("không hợp lệ");

  await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.getByTestId("video-metadata-preview")).toBeVisible();
});

test("unavailable video shows actionable safe copy", async ({ page }) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/notfound001");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Không tìm thấy hoặc không thể truy cập",
  );
  await expect(page.getByRole("button", { name: "Thử lại" })).toHaveCount(0);
});

test("transient fixture failure exposes one retry action", async ({ page }) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/retryfail01");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.getByRole("alert")).toContainText("chưa thể kiểm tra video");
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});
