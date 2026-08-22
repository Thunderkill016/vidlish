import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("personal-first learner sees start as primary and a truthful evidence checkpoint", async ({
  page,
}, testInfo) => {
  await login(page, `personal-first-${testInfo.project.name}@example.com`);

  await page.goto("/dashboard");
  const primary = page.getByRole("link", { name: "Học ngay", exact: true });
  await expect(primary).toBeVisible();
  await expect(primary).toHaveAttribute("href", "/start");

  // With no source lesson, the product should not tell a zero learner that
  // pasting a video is their required first move.
  await expect(
    page.getByRole("link", { name: "Bắt đầu học", exact: true }),
  ).toHaveAttribute("href", "/start");
  await expect(
    page.getByRole("link", { name: "Tạo bài từ YouTube", exact: true }),
  ).toHaveAttribute("href", "/create");
  await expect(page.getByText(/Video là một nguồn học nâng cao/)).toBeVisible();

  await primary.click();
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByText(/policy bảo thủ/)).toBeVisible();
  await expect(
    page.getByText(/không phải định nghĩa duy nhất của “comprehensible input”/),
  ).toBeVisible();

  await page.goto("/progress");
  await expect(
    page.getByRole("heading", { name: "Chưa có bằng chứng dùng độc lập" }),
  ).toBeVisible();
  await expect(page.getByText("Vòng học cá nhân")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bắt đầu buổi học →", exact: true }),
  ).toHaveAttribute("href", "/start");
  await expect(page.getByText(/không phải nhãn mastery/)).toHaveCount(0);
});
