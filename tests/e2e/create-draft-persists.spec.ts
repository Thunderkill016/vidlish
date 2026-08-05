import { expect, test } from "@playwright/test";

/**
 * The confirm card tells the learner their video and level are settled "trong
 * phiên này". A reload is still that session, so losing the confirmation there
 * breaks a promise the page makes out loud — and costs them the video lookup.
 */
test("a confirmed video and level survive a reload", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);

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
