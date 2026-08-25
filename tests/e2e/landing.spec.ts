import { expect, test } from "@playwright/test";

test("a visitor can understand the first A0 session and start from the landing page", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Đừng học thuộc trước. Hãy nghe và nói được một câu." }),
  ).toBeVisible();
  await expect(page.getByText("Nghe trước, rồi mới xem chữ").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Bắt đầu học miễn phí" })).toHaveAttribute(
    "href",
    "/sign-in",
  );
  await expect(page.getByText("Không cần biết gì để bắt đầu.")).toBeVisible();
});
