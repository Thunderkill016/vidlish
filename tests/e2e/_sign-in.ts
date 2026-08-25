import { expect, type Page } from "@playwright/test";

/**
 * Signs a learner in, in one place.
 *
 * Nine specs each carried their own copy of this, written for the old one-time
 * code form. When the sign-in flow changed to email and password, all nine
 * broke at once and every one of them had to be found and edited. One helper
 * cannot drift from itself.
 */
export const E2E_PASSWORD = "a long enough password";

export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page
    .getByRole("textbox", { name: "Mật khẩu", exact: true })
    .fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  // Landing anywhere inside the protected shell is the signal. Asserting one
  // exact route here would make every spec depend on where the product happens
  // to send a learner first.
  await expect(page).toHaveURL(/\/(start|dashboard|create)$/);
}
