import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

/**
 * @param rates what the embed reports from `getAvailablePlaybackRates`. Real
 * embeds do not all offer the same set, and the product must not claim a speed
 * the player never accepted — so this is a parameter, not a constant.
 */
async function mockYouTubeIframeApi(
  page: import("@playwright/test").Page,
  rates: readonly number[] = [0.25, 0.5, 0.75, 1, 1.5, 2],
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
            let rate = 1;
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
              getIframe() { return iframe; },
              // Mirrors a real embed: the rate only changes if it is one the
              // player offers, and the change is announced through the event
              // rather than assumed by the caller.
              getAvailablePlaybackRates() { return ${JSON.stringify(rates)}; },
              getPlaybackRate() { return rate; },
              setPlaybackRate(next) {
                window.__vidlishYouTubeCalls.push({ method: "rate", input: next });
                if (!this.getAvailablePlaybackRates().includes(next)) return;
                rate = next;
                options.events.onPlaybackRateChange?.({ target: player, data: next });
              }
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

  // VLR-102. Slowing the audio now sits between the hint and the caption,
  // because it reveals no language at all — a learner should not have to read
  // the English before being allowed to hear it more slowly.
  //
  // It is not opened from the support ladder. The ladder button refuses it and
  // points at the player, so the durable record can only say the audio slowed
  // once the player said so.
  await page.getByRole("button", { name: "Mở phát chậm hơn" }).click();
  await expect(
    page.getByText("Nhấn Phát chậm trong trình phát để dùng mức hỗ trợ này."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mở phụ đề tiếng anh" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Phát chậm 0.75×" }).click();
  await expect(
    page.getByText("Đang phát ở tốc độ 0.75× theo xác nhận của trình phát."),
  ).toBeVisible();
  await expect(
    page.getByText("Đoạn nguồn đang phát chậm hơn theo xác nhận của trình phát."),
  ).toBeVisible();

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

test("a player that cannot slow down never claims it did", async ({ page }) => {
  // VLR-102. The one thing this step must never do is tell a learner the audio
  // is slower when it is not: they would spend a support level and adjust their
  // listening for help they did not get.
  //
  // An embed reporting only full speed and faster is the honest failure case.
  // Without this the whole slow-playback path is unfalsifiable — every
  // assertion elsewhere runs against a mock that always accepts.
  await mockYouTubeIframeApi(page, [1, 1.5, 2]);
  await login(page);
  await page.goto("/learning-lab/v2");
  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();

  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page.getByRole("button", { name: "Mở gợi ý ngữ cảnh" }).click();

  const slowButton = page.getByRole("button", { name: /Chậm nhất rồi/ });
  await expect(slowButton).toBeVisible();
  await expect(slowButton).toBeDisabled();
  await expect(
    page.getByText(/theo xác nhận của trình phát/),
  ).toHaveCount(0);

  // And the ladder must not hand the step out either, or the learner would be
  // recorded as having received help the player refused.
  await page.getByRole("button", { name: "Mở phát chậm hơn" }).click();
  await expect(
    page.getByText("Nhấn Phát chậm trong trình phát để dùng mức hỗ trợ này."),
  ).toBeVisible();
  await expect(
    page.getByText("Đoạn nguồn đang phát chậm hơn theo xác nhận của trình phát."),
  ).toHaveCount(0);
});
