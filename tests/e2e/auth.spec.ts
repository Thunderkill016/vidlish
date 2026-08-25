import { expect, test } from "@playwright/test";

const TEST_PASSWORD = "a long enough password";

async function login(
  page: import("@playwright/test").Page,
  email = "invited@example.com",
) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

test("learner signs in, keeps session and signs out", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page.getByText("Nếp học tiếng Anh")).toBeVisible();
  await login(page);
  await expect(page).toHaveURL(/\/start$/);
  await expect(
    page.getByRole("heading", { name: "Hôm nay, nghe một câu để bắt đầu dùng tiếng Anh." }),
  ).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/start$/);

  await page.getByText("Tài khoản", { exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);

  await page.goBack();
  await expect(page).toHaveURL(/\/sign-in/);
  await page.reload();
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary$/);
});

test("a new learner can create an account with email and password", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Chuyển sang tạo tài khoản" }).click();
  await page.getByLabel("Email").fill("new-learner@example.com");
  await page.getByRole("textbox", { name: "Mật khẩu", exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("textbox", { name: "Xác nhận mật khẩu", exact: true }).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  await expect(page).toHaveURL(/\/start$/);
});

test("protected deep link returns after successful password sign-in", async ({ page }) => {
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Flibrary$/);
  await login(page);
  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "Bài học từ những nguồn bạn chọn" }),
  ).toBeVisible();
});

test("signed-in learner can reach account security settings", async ({ page }) => {
  await page.goto("/sign-in");
  await login(page, "security@example.com");
  await expect(page).toHaveURL(/\/start$/);
  await page.getByText("Tài khoản", { exact: true }).click();
  await page.getByRole("link", { name: "Bảo mật tài khoản" }).click();
  await expect(page.getByRole("heading", { name: "Bảo mật tài khoản" })).toBeVisible();
  await expect(page.getByRole("main").getByText("security@example.com")).toBeVisible();
});

test("external redirect is rejected", async ({ page }) => {
  await page.goto("/sign-in?next=https%3A%2F%2Fevil.example");
  await login(page);
  await expect(page).toHaveURL(/\/start$/);
});

test("malformed fake session cannot open protected content", async ({
  context,
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("baseURL is required");
  await context.addCookies([
    {
      name: "vidlish_test_session",
      value: encodeURIComponent("not-an-email"),
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/library");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("keyboard flow exposes labeled password controls and visible focus", async ({ page }) => {
  await page.goto("/sign-in");

  const signInTab = page.getByRole("button", { name: "Chuyển sang đăng nhập" });
  const signUpTab = page.getByRole("button", { name: "Chuyển sang tạo tài khoản" });
  const emailInput = page.getByLabel("Email");
  const passwordInput = page.getByRole("textbox", { name: "Mật khẩu", exact: true });

  await page.keyboard.press("Tab");
  await expect(signInTab).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(signUpTab).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(emailInput).toBeFocused();
  await expect(emailInput).toHaveAttribute("type", "email");

  await page.keyboard.press("Tab");
  await expect(passwordInput).toBeFocused();
  await expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
});
