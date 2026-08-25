import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("a long enough password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
}

test("a new learner has one clear next action in review and progress", async ({ page }, testInfo) => {
  await login(page, `core-shell-${testInfo.project.name}@example.com`);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Một bước tiếng Anh vừa sức hôm nay" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bắt đầu buổi học" })).toHaveAttribute(
    "href",
    "/start",
  );
  await expect(page.getByText("không phải bài đầu tiên")).toBeVisible();

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Nhớ lại để tiếng Anh ở lại lâu hơn" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quay lại bài học hôm nay" })).toHaveAttribute(
    "href",
    "/start",
  );
  await expect(page.getByText("Golden Session")).toHaveCount(0);

  await page.goto("/library");
  await expect(
    page.getByRole("heading", { name: "Bài học từ những nguồn bạn chọn" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Bắt đầu buổi học đầu tiên" })).toHaveAttribute(
    "href",
    "/start",
  );

  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Điều bạn tự làm được mới được tính" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bắt đầu buổi học" })).toHaveAttribute(
    "href",
    "/start",
  );
  await expect(page.getByText("điểm số để bắt đầu")).toBeVisible();
});
