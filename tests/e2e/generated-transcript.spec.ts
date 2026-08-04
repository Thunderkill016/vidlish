import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function createLesson(
  page: import("@playwright/test").Page,
  videoId: string,
) {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill(`https://youtu.be/${videoId}`);
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: "B1 Trung cấp" }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await page.getByRole("button", { name: "Tạo bài học" }).click();
  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
}

test.beforeEach(async ({ page }) => login(page));

test("uses hosted generation after native captions are unavailable", async ({
  page,
}) => {
  const jobRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/jobs")) {
      jobRequests.push(request.url());
    }
  });

  await createLesson(page, "nocaption01");

  await expect(page.getByText("Phân tích video", { exact: true })).toBeVisible();
  await expect(page.getByText(/Supadata|provider_job|metered/i)).toHaveCount(0);
  expect(jobRequests).toHaveLength(1);

  const jobUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(jobUrl);
  await expect(page.getByText("Phân tích video", { exact: true })).toBeVisible();
});

test("replaces weak native evidence with a generated transcript before the gate", async ({
  page,
}) => {
  await createLesson(page, "shorteng001");

  await expect(page.getByText("Phân tích video", { exact: true })).toBeVisible();
  await expect(page.getByText("Video không đủ tiếng Anh gốc")).toHaveCount(0);
  await expect(page.getByText(/Supadata|provider_job|metered/i)).toHaveCount(0);
});
