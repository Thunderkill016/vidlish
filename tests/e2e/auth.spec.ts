import { expect, test } from "@playwright/test";

async function requestCode(page: import("@playwright/test").Page, email: string) {
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await expect(page.getByLabel("Mã đăng nhập gồm 6 chữ số")).toBeVisible();
}

async function login(
  page: import("@playwright/test").Page,
  email = "invited@example.com",
) {
  await requestCode(page, email);
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

test("allowlisted learner signs in, keeps session and signs out", async ({ page }) => {
  await page.goto("/sign-in");
  await login(page);
  await expect(page).toHaveURL(/\/create$/);
  await expect(
    page.getByRole("heading", { name: "Không gian học của bạn đã sẵn sàng" }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/create$/);

  await page.getByText("Tài khoản").click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary$/);
});

test("non-allowlisted email receives neutral response and no usable session", async ({
  page,
}) => {
  await page.goto("/sign-in");
  await requestCode(page, "not-invited@example.com");
  await expect(
    page.getByText("Nếu email của bạn được mời, mã đăng nhập sẽ được gửi."),
  ).toBeVisible();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page.locator("#auth-error")).toContainText(
    "không đúng hoặc đã hết hạn",
  );
});

test("protected deep link returns after successful OTP", async ({ page }) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary$/);
  await login(page);
  await expect(page).toHaveURL(/\/library$/);
  await expect(page.getByRole("heading", { name: "Bài học đã lưu" })).toBeVisible();
});

test("external redirect is rejected", async ({ page }) => {
  await page.goto("/sign-in?next=https%3A%2F%2Fevil.example");
  await login(page);
  await expect(page).toHaveURL(/\/create$/);
});

test("revoked fake session cannot open protected content", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("baseURL is required");
  await context.addCookies([
    {
      name: "vidlish_test_session",
      value: encodeURIComponent("revoked@example.com"),
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("keyboard flow exposes labeled controls and visible focus", async ({ page }) => {
  await page.goto("/sign-in");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email được mời")).toBeFocused();
  await expect(page.getByLabel("Email được mời")).toHaveAttribute("type", "email");
});
