import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("dashboard gives the learner a clear daily home on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Hôm nay học gì?" }),
  ).toBeVisible();
  await expect(page.getByText("Từ nền", { exact: true })).toBeVisible();
  await expect(page.getByText("Ôn hôm nay", { exact: true })).toBeVisible();

  const beginnerLink = page.locator('a[href="/start"]').filter({
    hasText: /Bắt đầu học|Học tiếp từ nền/,
  });
  await expect(beginnerLink).toBeVisible();
  await expect(
    page.getByRole("link", { name: "+ Tạo bài từ video" }),
  ).toBeVisible();

  const mobileNav = page.getByRole("navigation", {
    name: "Điều hướng chính trên di động",
  });
  await expect(mobileNav.getByRole("link")).toHaveCount(5);
  await expect(mobileNav.getByRole("link", { name: "Tạo bài" })).toHaveCount(0);
  await expect(mobileNav.getByRole("link", { name: "Tổng quan" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Từ số 0" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Thư viện" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Ôn tập" })).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "Tiến bộ" })).toBeVisible();
});
