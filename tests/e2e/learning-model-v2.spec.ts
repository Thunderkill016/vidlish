import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

test("Learning Model v2 requires attempts before evidence and resumes the flow", async ({
  page,
}) => {
  await login(page);
  await page.goto("/learning-lab/v2");

  await expect(
    page.getByRole("heading", {
      name: "Không đọc một bài dài. Hãy hoàn thành một vòng học.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Sau phiên này, bạn có thể")).toBeVisible();
  await expect(page.getByText("Evidence từ transcript canonical")).toHaveCount(0);

  await page.getByRole("button", { name: "Bắt đầu với ý chính" }).click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();
  await expect(page.getByText("Evidence từ transcript canonical")).toHaveCount(0);

  await page.getByLabel("Nghe toàn bộ thông điệp trước").check();
  await page.getByRole("button", { name: "Gửi attempt" }).click();

  await expect(page.getByText("Đúng", { exact: true })).toBeVisible();
  await expect(page.getByText("Evidence từ transcript canonical")).toBeVisible();
  await expect(
    page.getByText(/A useful study routine begins with the whole message/),
  ).toBeVisible();

  await page.getByRole("button", { name: "Tiếp tục" }).click();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();

  // Lab progress survives a page reload, while private free-text responses are
  // intentionally not written to local storage.
  await page.reload();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();

  await page.getByLabel("Hướng sự tập trung vào các cụm từ").check();
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("pay attention to", { exact: true })).toBeVisible();
  await expect(page.getByText(/Register: neutral/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 3/5 · Tự nhớ lại")).toBeVisible();
  await page.getByLabel("Complete: On the second pass, ___ phrases.").fill("pay attention to");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("Bạn đã nhớ lại đúng toàn bộ cụm.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 4/5 · Dùng trong tình huống mới")).toBeVisible();
  await page
    .getByLabel("Viết một câu khuyên bạn ấy bằng pay attention to.")
    .fill("Pay attention to the order of the ingredients.");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText("Tự đối chiếu sau khi đã viết")).toBeVisible();
  await expect(page.getByText("Ví dụ mới, không phải câu trong video:")).toBeVisible();
  await expect(page.getByText("Đúng", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Chưa đúng", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 5/5 · Kết thúc")).toBeVisible();
  await page
    .getByLabel("Bạn cần nghe lại ý chính hay luyện dùng chunk thêm?")
    .fill("Tôi muốn luyện dùng chunk thêm trong một tình huống mới.");
  await page.getByRole("button", { name: "Gửi attempt" }).click();
  await expect(page.getByText(/không phải điểm năng lực khách quan/i)).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();

  await expect(
    page.getByRole("heading", { name: "Bạn đã nghe, nhớ lại và vận dụng." }),
  ).toBeVisible();
  await expect(page.getByText(/không được coi là mastery/i)).toBeVisible();
});
