import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function mockYouTubeIframeApi(
  page: import("@playwright/test").Page,
) {
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.__vidlishYouTubeCalls = [];
        window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          Player: function (element, options) {
            const iframe = document.createElement("iframe");
            iframe.dataset.mockYoutube = "true";
            element.replaceWith(iframe);
            const player = {
              cueVideoById(input) {
                window.__vidlishYouTubeCalls.push({ method: "cue", input });
              },
              loadVideoById(input) {
                window.__vidlishYouTubeCalls.push({ method: "load", input });
                options.events.onStateChange({ target: player, data: 1 });
              },
              pauseVideo() {
                window.__vidlishYouTubeCalls.push({ method: "pause" });
                options.events.onStateChange({ target: player, data: 2 });
              },
              destroy() { iframe.remove(); },
              getIframe() { return iframe; }
            };
            setTimeout(() => options.events.onReady({ target: player }), 0);
            return player;
          }
        };
        setTimeout(() => window.onYouTubeIframeAPIReady?.(), 0);
      `,
    });
  });
}

test("golden Learning Model v2 session enforces support retry transfer and honest completion", async ({
  page,
}) => {
  await mockYouTubeIframeApi(page);
  await login(page);
  await page.goto("/learning-lab/v2");

  await expect(
    page.getByRole("heading", {
      name: "Nghe rõ một đoạn thật. Dùng được một cụm thật.",
    }),
  ).toBeVisible();
  await expect(page.getByText("a member of", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();

  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bật phụ đề" })).toHaveCount(0);
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await expect(page.getByText("Bạn đã chủ động nghe lại đoạn nguồn.")).toBeVisible();
  await page.getByRole("button", { name: "Mở gợi ý ngữ cảnh" }).click();
  await expect(page.getByText(/buổi hướng dẫn kỹ thuật/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Mở phụ đề tiếng anh" })).toHaveCount(0);

  await page.getByLabel("Cách chọn phần cứng quay video").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Chưa đúng", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();
  // No keyword hint any more. It could only be filled with words from the
  // passage, and for a gist question those words are most of the answer — a
  // support step the product cannot fill honestly is worse than one it does not
  // offer, because the learner spends a support level for nothing.
  await expect(
    page.getByRole("button", { name: "Mở gợi ý từ khóa" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mở phụ đề tiếng anh" }).click();
  await expect(page.getByRole("button", { name: "Bật phụ đề" })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await page
    .getByLabel("Các cách tùy chỉnh trình phát YouTube nhúng")
    .check();
  await page.getByRole("button", { name: "Gửi lần thử lại" }).click();
  await expect(page.getByText("Đúng", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();
  await page.getByLabel("Giới thiệu người nói thuộc một đội").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("a member of", { exact: true })).toBeVisible();
  await expect(page.getByText(/Register: neutral/)).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 3/5 · Tự nhớ lại")).toBeVisible();
  await page
    .getByLabel("Complete: I'm ___ the Developer Relations team.")
    .fill("member of");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Chưa đúng", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await page
    .getByLabel("Complete: I'm ___ the Developer Relations team.")
    .fill("a member of");
  await page.getByRole("button", { name: "Gửi lần thử lại" }).click();
  await expect(page.getByText("Bạn đã nhớ lại đúng toàn bộ cụm.")).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(
    page.getByText("Bước 4/5 · Dùng trong tình huống mới"),
  ).toBeVisible();
  await page
    .getByLabel(
      "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
    )
    .fill("I'm in the release team.");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Tự đối chiếu câu bạn vừa viết")).toBeVisible();

  const criteria = page.locator('input[type="checkbox"]');
  await criteria.nth(0).check();
  await criteria.nth(1).check();
  await expect(
    page.getByRole("button", { name: "Xác nhận đủ tiêu chí" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Chỉnh lại toàn bộ câu" }).click();

  await page
    .getByLabel(
      "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
    )
    .fill("I'm a member of the release team.");
  await page.getByRole("button", { name: "Gửi lần thử lại" }).click();
  await criteria.nth(0).check();
  await criteria.nth(1).check();
  await criteria.nth(2).check();
  await page.getByRole("button", { name: "Xác nhận đủ tiêu chí" }).click();
  await expect(
    page.getByText("Đã xác nhận đủ tiêu chí cho lần thử này."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 5/5 · Kết thúc")).toBeVisible();
  await expect(page.getByTestId("youtube-player")).toBeVisible();
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page
    .getByLabel(
      "Không nhìn câu mẫu: bạn nghe được cách nói nào để giới thiệu người nói thuộc một nhóm?",
    )
    .fill("a member of");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText(/không phải điểm năng lực khách quan/i)).toBeVisible();
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Bạn đã tạo được evidence cho lần học hôm nay.",
    }),
  ).toBeVisible();
  await expect(page.getByText(/không phải tuyên bố đã thành thạo/i)).toBeVisible();
  await expect(page.getByText("Đã viết và tự đối chiếu đủ tiêu chí")).toBeVisible();

  await page.goto("/review");
  await expect(page.getByText("Lịch ôn đã được tạo")).toBeVisible();
  await expect(page.getByText("Đang chờ delay")).toBeVisible();
  await expect(page.getByText(/mục cần ôn/)).toHaveCount(0);
});
