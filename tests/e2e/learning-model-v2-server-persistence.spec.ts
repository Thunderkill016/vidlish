import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.describe.configure({ retries: 0 });
test.skip(
  process.env.LEARNING_SESSION_REPOSITORY !== "supabase",
  "This specification is reserved for the isolated Supabase-backed CI job.",
);

const PRIVATE_TRANSFER_TEXT = "I'm a member of the release team PRIVATE-7f83.";
const PRIVATE_REFLECTION_TEXT = "PRIVATE-REFLECTION-20260807-7f83";
const PRIVATE_DELAYED_TRANSFER_TEXT =
  "I'm a member of the community volunteer team PRIVATE-DELAYED-91ac.";

async function login(page: Page) {
  await page.goto("/sign-in");
  await page
    .getByLabel("Email được mời")
    .fill("learning-preview@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function mockYouTubeIframeApi(page: Page) {
  await page.route("https://www.youtube.com/iframe_api", async (route) => {
    await route.fulfill({
      contentType: "application/javascript",
      body: `
        window.YT = {
          PlayerState: { PLAYING: 1, PAUSED: 2, ENDED: 0 },
          Player: function (element, options) {
            const iframe = document.createElement("iframe");
            iframe.dataset.mockYoutube = "true";
            element.replaceWith(iframe);
            const player = {
              cueVideoById() {},
              loadVideoById() {
                options.events.onStateChange({ target: player, data: 1 });
              },
              pauseVideo() {
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

test("Golden Session UI persists immediate and delayed learning evidence without raw learner text", async ({
  page,
}) => {
  await mockYouTubeIframeApi(page);
  await login(page);
  await page.goto("/learning-lab/v2");

  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();

  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await expect(page.getByText("Bạn đã chủ động nghe lại đoạn nguồn.")).toBeVisible();
  await page.getByRole("button", { name: "Mở gợi ý ngữ cảnh" }).click();

  await page.getByLabel("Cách chọn phần cứng quay video").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await expect(page.getByText("Chưa đúng", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();

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
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Bước 2/5 · Hiểu cách dùng")).toBeVisible();

  await page.getByLabel("Giới thiệu người nói thuộc một đội").check();
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page
    .getByLabel("Complete: I'm ___ the Developer Relations team.")
    .fill("a member of");
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page
    .getByLabel(
      "Viết một câu giới thiệu bạn là thành viên của nhóm bằng a member of.",
    )
    .fill(PRIVATE_TRANSFER_TEXT);
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  const criteria = page.locator('input[type="checkbox"]');
  await criteria.nth(0).check();
  await criteria.nth(1).check();
  await criteria.nth(2).check();
  await page.getByRole("button", { name: "Xác nhận đủ tiêu chí" }).click();
  await expect(
    page.getByText("Đã xác nhận đủ tiêu chí cho lần thử này."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await expect(page.getByText("Bước 5/5 · Kết thúc")).toBeVisible();
  await page.getByRole("button", { name: "Phát đoạn" }).click();
  await page
    .getByLabel(
      "Không nhìn câu mẫu: bạn nghe được cách nói nào để giới thiệu người nói thuộc một nhóm?",
    )
    .fill(PRIVATE_REFLECTION_TEXT);
  await page.getByRole("button", { name: "Kiểm tra câu trả lời" }).click();
  await page.getByRole("button", { name: "Hoàn tất phiên" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Bạn đã tạo được evidence cho lần học hôm nay.",
    }),
  ).toBeVisible();

  let localState = await page.evaluate(() => Object.values(localStorage).join("\n"));
  expect(localState).not.toContain(PRIVATE_TRANSFER_TEXT);
  expect(localState).not.toContain(PRIVATE_REFLECTION_TEXT);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  expect(supabaseUrl).toBeTruthy();
  expect(serviceKey).toBeTruthy();
  const admin = createClient(supabaseUrl!, serviceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: sessions, error: sessionsError } = await admin
    .from("lesson_sessions")
    .select("id,status,current_phase,current_activity_id,completed_at")
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("lesson_version_id", "77777777-7777-4777-8777-777777777777");
  expect(sessionsError).toBeNull();
  expect(sessions).toHaveLength(1);
  expect(sessions?.[0]).toMatchObject({
    status: "completed",
    current_phase: "completed",
    current_activity_id: "activity_exit",
  });
  expect(sessions?.[0]?.completed_at).toBeTruthy();

  const sessionId = sessions?.[0]?.id as string;
  const { data: attempts, error: attemptsError } = await admin
    .from("activity_attempts")
    .select("activity_id,attempt_number,response,evaluation")
    .eq("session_id", sessionId)
    .order("submitted_at", { ascending: true });

  expect(attemptsError).toBeNull();
  expect(
    attempts?.map((attempt) => [
      attempt.activity_id,
      attempt.attempt_number,
      (attempt.evaluation as { verdict?: string }).verdict,
    ]),
  ).toEqual([
    ["activity_gist", 1, "incorrect"],
    ["activity_gist", 2, "correct"],
    ["activity_meaning", 1, "correct"],
    ["activity_recall", 1, "correct"],
    ["activity_transfer", 1, "self_check"],
    ["activity_transfer", 2, "self_check"],
    ["activity_exit", 1, "unscored"],
  ]);

  for (const attempt of attempts ?? []) {
    const response = attempt.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "text")).toBe(false);
  }
  expect(attempts?.[4]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [],
  });
  expect(attempts?.[5]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [0, 1, 2],
  });

  const { data: supportEvents, error: supportEventsError } = await admin
    .from("learning_support_events")
    .select("*")
    .eq("session_id", sessionId);
  expect(supportEventsError).toBeNull();
  // Two gist replays, the two support steps the ladder still offers, and one
  // exit replay. This total and the per-kind assertions below have to be
  // changed together; when the keyword hint left the ladder only the per-kind
  // ones were updated, and the stale total was the failure.
  expect(supportEvents).toHaveLength(5);

  const gistPlaybackOrdinals = (supportEvents ?? [])
    .filter(
      (event) =>
        event.activity_id === "activity_gist" && event.event_kind === "playback",
    )
    .map((event) => event.playback_ordinal)
    .sort((a, b) => Number(a) - Number(b));
  expect(gistPlaybackOrdinals).toEqual([1, 2]);

  const gistSupportSteps = (supportEvents ?? [])
    .filter(
      (event) =>
        event.activity_id === "activity_gist" &&
        event.event_kind === "support_opened",
    )
    .map((event) => event.support_step)
    .sort();
  // Keyword hint is gone from the ladder, so it must not appear in the durable
  // record either — the persisted evidence and the offered ladder are the same
  // claim seen from two sides.
  expect(gistSupportSteps).toEqual(["context_hint", "english_caption"].sort());

  const exitPlayback = (supportEvents ?? []).filter(
    (event) =>
      event.activity_id === "activity_exit" && event.event_kind === "playback",
  );
  expect(exitPlayback).toHaveLength(1);
  expect(exitPlayback[0]?.playback_ordinal).toBe(1);

  for (const event of supportEvents ?? []) {
    expect(event).not.toHaveProperty("text");
    expect(event).not.toHaveProperty("caption");
    expect(event).not.toHaveProperty("copy");
  }

  const { data: scheduledItems, error: scheduledItemsError } = await admin
    .from("learning_item_states")
    .select(
      "item_key,exposure_count,attempt_count,successful_retrievals,last_outcome,next_review_at,last_delayed_transfer_at",
    )
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("item_key", "a-member-of");
  expect(scheduledItemsError).toBeNull();
  expect(scheduledItems).toHaveLength(1);
  expect(scheduledItems?.[0]).toMatchObject({
    item_key: "a-member-of",
    exposure_count: 1,
    attempt_count: 0,
    successful_retrievals: 0,
    last_outcome: null,
    last_delayed_transfer_at: null,
  });
  expect(new Date(scheduledItems?.[0]?.next_review_at as string).getTime()).toBeGreaterThan(
    Date.now(),
  );

  await page.goto("/review");
  await expect(page.getByText("Lịch ôn đã được tạo")).toBeVisible();
  await expect(page.getByText("Đang chờ delay")).toBeVisible();

  const dueAt = new Date(Date.now() - 60_000).toISOString();
  const { error: makeDueError } = await admin
    .from("learning_item_states")
    .update({ next_review_at: dueAt })
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("item_key", "a-member-of");
  expect(makeDueError).toBeNull();

  await page.reload();
  await expect(page.getByText("1 mục cần ôn")).toBeVisible();
  await page.getByRole("link", { name: "Bắt đầu phiên ôn" }).click();
  await expect(page).toHaveURL(/\/learning-lab\/v2\/review$/);
  await page.getByRole("button", { name: "Bắt đầu ôn" }).click();

  await expect(page.getByText("Gọi lại trước khi nhìn đáp án")).toBeVisible();
  await expect(page.getByText("a member of", { exact: true })).toHaveCount(0);

  await page.getByLabel("Câu trả lời").fill("member of");
  await page.getByRole("button", { name: "Kiểm tra trí nhớ" }).click();
  await expect(page.getByText("Chưa nhớ đủ")).toBeVisible();
  await expect(page.getByText("a member of", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Thử lại không nhìn đáp án" }).click();
  await expect(page.getByText("a member of", { exact: true })).toHaveCount(0);

  await page.getByLabel("Câu trả lời").fill("a member of");
  await page.getByRole("button", { name: "Kiểm tra trí nhớ" }).click();
  await expect(page.getByText("Không lặp lại câu nguồn")).toBeVisible();
  await expect(page.getByText(/nhóm tình nguyện cộng đồng/i)).toBeVisible();
  await expect(page.getByText("Câu mẫu sau attempt:")).toHaveCount(0);

  await page.getByLabel("Câu của bạn").fill(PRIVATE_DELAYED_TRANSFER_TEXT);
  await page.getByRole("button", { name: "Gửi câu để tự đối chiếu" }).click();
  await expect(page.getByText("Tự đối chiếu câu bạn vừa viết")).toBeVisible();
  await expect(
    page.getByText(
      "Câu mẫu sau attempt: I'm a member of the community volunteer team.",
      { exact: true },
    ),
  ).toBeVisible();

  const delayedCriteria = page.locator('input[type="checkbox"]');
  await delayedCriteria.nth(0).check();
  await delayedCriteria.nth(1).check();
  await delayedCriteria.nth(2).check();
  await page.getByRole("button", { name: "Xác nhận đủ tiêu chí" }).click();
  await expect(
    page.getByRole("heading", { name: "Phiên ôn đã hoàn tất" }),
  ).toBeVisible();
  await expect(page.getByText(/không phải tuyên bố.*mastered/i)).toBeVisible();

  localState = await page.evaluate(() => Object.values(localStorage).join("\n"));
  expect(localState).not.toContain(PRIVATE_DELAYED_TRANSFER_TEXT);

  const { data: reviewSessions, error: reviewSessionsError } = await admin
    .from("learning_review_sessions")
    .select("id,status,current_step,scheduled_for,completed_at,variant_id")
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("item_key", "a-member-of");
  expect(reviewSessionsError).toBeNull();
  expect(reviewSessions).toHaveLength(1);
  expect(reviewSessions?.[0]).toMatchObject({
    status: "completed",
    current_step: "completed",
    variant_id: "review_variant_affiliation_01",
  });
  expect(reviewSessions?.[0]?.completed_at).toBeTruthy();

  const reviewSessionId = reviewSessions?.[0]?.id as string;
  const { data: reviewAttempts, error: reviewAttemptsError } = await admin
    .from("learning_review_attempts")
    .select("step,attempt_number,response,evaluation")
    .eq("review_session_id", reviewSessionId)
    .order("submitted_at", { ascending: true });
  expect(reviewAttemptsError).toBeNull();
  expect(
    reviewAttempts?.map((attempt) => [
      attempt.step,
      attempt.attempt_number,
      (attempt.evaluation as { verdict?: string }).verdict,
    ]),
  ).toEqual([
    ["recall", 1, "incorrect"],
    ["recall", 2, "correct"],
    ["transfer", 1, "self_check"],
    ["transfer", 2, "self_check"],
  ]);

  for (const attempt of reviewAttempts ?? []) {
    const response = attempt.response as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(response, "text")).toBe(false);
  }
  expect(reviewAttempts?.[2]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [],
  });
  expect(reviewAttempts?.[3]?.response).toMatchObject({
    kind: "self_check",
    checkedCriteria: [0, 1, 2],
  });

  const { data: reviewedItems, error: reviewedItemsError } = await admin
    .from("learning_item_states")
    .select(
      "attempt_count,successful_retrievals,last_outcome,next_review_at,last_delayed_transfer_at",
    )
    .eq("owner_user_id", "133f314f-4bfd-46aa-8fc6-b6a33252232b")
    .eq("item_key", "a-member-of");
  expect(reviewedItemsError).toBeNull();
  expect(reviewedItems).toHaveLength(1);
  expect(reviewedItems?.[0]).toMatchObject({
    attempt_count: 4,
    successful_retrievals: 1,
    last_outcome: "hard",
  });
  expect(reviewedItems?.[0]?.last_delayed_transfer_at).toBeTruthy();
  expect(new Date(reviewedItems?.[0]?.next_review_at as string).getTime()).toBeGreaterThan(
    Date.now(),
  );
});
