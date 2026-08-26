import { expect, test, type Page } from "@playwright/test";

import { signIn } from "./_sign-in";

test("dashboard gives the learner a clear daily home on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "invited@example.com");
  await page.goto("/dashboard");

  await expect(
    page.getByRole("heading", { name: "Một bước tiếng Anh vừa sức hôm nay" }),
  ).toBeVisible();
  await expect(page.getByText("Từ nền", { exact: true })).toBeVisible();
  await expect(page.getByText("Ôn hôm nay", { exact: true })).toBeVisible();

  const beginnerLink = page.locator('a[href="/start"]').filter({
    hasText: /Bắt đầu học|Học tiếp từ nền/,
  });
  await expect(beginnerLink).toBeVisible();
  await expect(
    page.getByRole("link", { name: "+ Tạo bài từ video" }),
  ).toBeVisible();

  const mobileNav = page.getByRole("navigation", {
    name: "Điều hướng chính trên di động",
  });
  await expect(mobileNav.getByRole("link")).toHaveCount(5);

  // Tie the count to the layout that depends on it. The bar is a fixed
  // five-column grid, so a sixth item does not shrink the others — it wraps
  // onto a second row of an element pinned to the bottom of the screen and
  // covers the content behind it.
  const columns = await mobileNav.evaluate(
    (element) => getComputedStyle(element).gridTemplateColumns.split(" ").length,
  );
  expect(columns).toBe(5);

  // Five doors, and the first is the whole product. Review and sentence
  // building are steps inside the daily session, not destinations — a learner
  // with thirty minutes should not spend any of them choosing.
  for (const label of ["Hôm nay", "Đọc", "Luyện tai", "Lộ trình", "Tiến bộ"]) {
    await expect(mobileNav.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(mobileNav.getByRole("link", { name: "Ôn tập" })).toHaveCount(0);
  await expect(mobileNav.getByRole("link", { name: "Thư viện" })).toHaveCount(0);
  await expect(page.getByTestId("library-entry")).toBeVisible();
});
