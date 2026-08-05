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

test("a video with no usable captions ends instead of polling forever", async ({
  page,
}) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/nocaption01");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: "B1 Trung cấp" }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await page.getByRole("button", { name: "Tạo bài học" }).click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);

  const card = page.getByTestId("transcript-unavailable");
  await expect(card).toContainText("Chưa lấy được lời thoại");
  // Missing captions must never be reported as a language verdict.
  await expect(page.getByTestId("language-unsupported")).toHaveCount(0);
  await expect(card).toContainText("không có nghĩa video sai ngôn ngữ");
  await expect(page.getByText(/supadata|provider|caption track/i)).toHaveCount(0);

  // The job is terminal, so a reload keeps the outcome and nothing restarts.
  const jobUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(jobUrl);
  await expect(page.getByTestId("transcript-unavailable")).toBeVisible();

  await page.getByRole("button", { name: "Chọn video khác" }).click();
  await expect(page).toHaveURL(/\/create$/);
});
