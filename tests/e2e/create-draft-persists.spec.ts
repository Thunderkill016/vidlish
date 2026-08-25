import { expect, test } from "@playwright/test";

/**
 * The confirm card tells the learner their video and level are settled "trong
 * phiên này". A reload is still that session, so losing the confirmation there
 * breaks a promise the page makes out loud — and costs them the video lookup.
 */
test("a confirmed video and level survive a reload", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("invited@example.com");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill("a long enough password");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.goto("/create");

  await page.getByLabel("Liên kết video YouTube").fill("https://youtu.be/dQw4w9WgXcQ");
  await page.getByRole("button", { name: "Kiểm tra video" }).click();
  await page.getByRole("button", { name: "B1 Trung cấp" }).click();
  await page.getByRole("button", { name: "Xác nhận lựa chọn" }).click();
  await expect(page.getByTestId("confirmed-lesson-draft")).toBeVisible();

  await page.reload();

  await expect(page.getByTestId("confirmed-lesson-draft")).toBeVisible();
  await expect(page.getByTestId("confirmed-lesson-draft")).toContainText("B1");
  await expect(page.getByLabel("Liên kết video YouTube")).toHaveValue(
    "https://youtu.be/dQw4w9WgXcQ",
  );
  await expect(page.getByRole("button", { name: "Tạo bài học" })).toBeVisible();
});
