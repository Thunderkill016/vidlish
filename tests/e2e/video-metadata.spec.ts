import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function prepareConfirmedDraft(
  page: import("@playwright/test").Page,
  cefrName = "B2 Trung cấp cao",
) {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: cefrName }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await expect(page.getByTestId("confirmed-lesson-draft")).toBeVisible();
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
  await expect(page.locator("#video-url-error")).toContainText("không hợp lệ");

  await input.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.getByTestId("video-metadata-preview")).toBeVisible();
});

test("unavailable video shows actionable safe copy", async ({ page }) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/notfound001");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.locator("#video-url-error")).toContainText(
    "Không tìm thấy hoặc không thể truy cập",
  );
  await expect(page.getByRole("button", { name: "Thử lại" })).toHaveCount(0);
});

test("transient fixture failure exposes one retry action", async ({ page }) => {
  await page
    .getByLabel("Liên kết video YouTube")
    .fill("https://youtu.be/retryfail01");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(page.locator("#video-url-error")).toContainText(
    "chưa thể kiểm tra video",
  );
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});

test("selects CEFR and keeps readiness invalidation rules", async ({ page }) => {
  const jobRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/jobs")) jobRequests.push(request.url());
  });

  const input = page.getByLabel("Liên kết video YouTube");
  await input.fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();

  const cefrGroup = page.getByRole("group", {
    name: "Trình độ tiếng Anh của bạn",
  });
  await expect(cefrGroup).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);

  const confirm = page.getByRole("button", { name: "Xác nhận lựa chọn" });
  await expect(confirm).toBeDisabled();
  const b2 = page.getByRole("button", { name: "B2 Trung cấp cao" });
  await b2.click();
  await expect(b2).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();

  await confirm.click();
  const draft = page.getByTestId("confirmed-lesson-draft");
  await expect(draft).toContainText("Sẵn sàng tạo bài học");
  await expect(draft).toContainText("trình độ B2");
  await expect(draft).toContainText("không lưu video");
  await expect(page.getByRole("button", { name: "Tạo bài học" })).toBeVisible();
  expect(jobRequests).toEqual([]);

  await input.fill("https://youtu.be/dQw4w9WgXcQ?t=10");
  await expect(draft).toHaveCount(0);
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await expect(
    page.getByRole("button", { name: "B2 Trung cấp cao" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("creates one durable job, redirects and survives reload", async ({ page }) => {
  const createRequests: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/jobs")) {
      createRequests.push(request.url());
    }
  });

  await prepareConfirmedDraft(page);
  await page.getByRole("button", { name: "Tạo bài học" }).click();

  await expect(page).toHaveURL(/\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Tiến trình" })).toBeVisible();
  await expect(page.getByText("Lấy hoặc tạo transcript", { exact: true })).toBeVisible();
  await expect(page.getByText("How to build a better learning habit")).toBeVisible();
  expect(createRequests).toHaveLength(1);

  const jobUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(jobUrl);
  await expect(page.getByText("Lấy hoặc tạo transcript", { exact: true })).toBeVisible();
  await expect(page.getByText("Bạn có thể đóng trang này.")).toBeVisible();
});
