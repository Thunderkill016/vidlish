import { expect, test, type Page } from "@playwright/test";

import { goldenSessionUsabilityParticipantSchema } from "@/shared/contracts/golden-session-usability";

test.describe.configure({ retries: 0 });
test.skip(
  process.env.LEARNING_SESSION_REPOSITORY !== "supabase",
  "This specification is reserved for the isolated Supabase-backed CI job.",
);

const OWNER_EMAIL = "learning-preview@example.com";
const OTHER_EMAIL = "golden-study-observer@example.com";

async function login(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill(email);
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

async function logout(page: Page) {
  await page.getByText("Tài khoản", { exact: true }).click();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
}

test("moderator captures the current owner's durable Golden session without typing a session id", async ({
  page,
}) => {
  await login(page, OWNER_EMAIL);
  await page.goto("/learning-lab/v2");
  await page
    .getByRole("button", { name: "Bắt đầu nghe không phụ đề" })
    .click();
  await expect(page.getByText("Bước 1/5 · Nắm ý chính")).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem("vidlish:unrelated-operator-state", "keep-me");
  });

  await page.goto("/learning-lab/v2/usability/capture");
  await expect(
    page.getByRole("heading", { name: "Capture một participant thật" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tải measurement" }).click();
  await expect(page.getByText("Trạng thái durable")).toBeVisible();
  await expect(page.getByText("in_progress", { exact: true })).toBeVisible();

  // Moderator-only evidence must start unset. The page may show durable facts,
  // but it must never translate those facts into a positive human observation.
  await expect(page.getByLabel("Participant code")).toHaveValue("");
  await expect(page.getByLabel("Platform")).toHaveValue("");
  await expect(
    page.getByLabel("Completed without moderator instruction"),
  ).toHaveValue("");
  await expect(page.getByLabel("Lesson goal restated")).toHaveValue("");
  await expect(page.getByLabel("Before target recognition")).toHaveValue("");
  await expect(page.getByLabel("After target recognition")).toHaveValue("");
  await expect(page.getByLabel("Participant blocked")).toHaveValue("");
  await expect(page.getByLabel("Severe defect")).toHaveValue("");

  await page.getByLabel("Participant code").selectOption("p1");
  await page.getByLabel("Platform").selectOption("desktop");
  await page
    .getByLabel("Completed without moderator instruction")
    .selectOption("no");
  await page.getByLabel("Lesson goal restated").selectOption("yes");
  await page
    .getByLabel("Before target recognition")
    .selectOption("not_recognized");
  await page.getByLabel("After target recognition").selectOption("partial");
  await page.getByLabel("Participant blocked").selectOption("no");
  await page.getByLabel("Severe defect").selectOption("none");
  await page.getByRole("button", { name: "Tạo participant JSON" }).click();

  const participantText = await page.getByLabel("Participant JSON").inputValue();
  const participant = goldenSessionUsabilityParticipantSchema.parse(
    JSON.parse(participantText),
  );
  expect(participant.observation).toMatchObject({
    participantCode: "p1",
    platform: "desktop",
    completedWithoutModeratorInstruction: false,
    lessonGoalRestated: true,
    beforeTargetRecognition: "not_recognized",
    afterTargetRecognition: "partial",
    blocked: false,
    blockKind: null,
    severeDefectKind: null,
  });
  expect(participant.measurement.status).toBe("in_progress");

  const sessionId = participant.measurement.sessionId;

  // A moderator correction makes the previously built JSON stale. It must stop
  // being copyable until the record is explicitly rebuilt from current inputs.
  await page.getByLabel("Lesson goal restated").selectOption("no");
  await expect(page.getByLabel("Participant JSON")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Sao chép participant JSON" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "Tạo participant JSON" }).click();
  const rebuiltParticipantText = await page
    .getByLabel("Participant JSON")
    .inputValue();
  const rebuiltParticipant = goldenSessionUsabilityParticipantSchema.parse(
    JSON.parse(rebuiltParticipantText),
  );
  expect(rebuiltParticipant.measurement.sessionId).toBe(sessionId);
  expect(rebuiltParticipant.observation.lessonGoalRestated).toBe(false);

  await page.getByRole("button", { name: "Xóa Golden browser state" }).click();
  await expect(page.getByText(/Golden browser state đã được xóa/)).toBeVisible();
  const storageAfterReset = await page.evaluate(() => ({
    unrelated: localStorage.getItem("vidlish:unrelated-operator-state"),
    goldenKeys: Object.keys(localStorage).filter((key) =>
      key.startsWith("vidlish:learning-lab:v4:"),
    ),
  }));
  expect(storageAfterReset.unrelated).toBe("keep-me");
  expect(storageAfterReset.goldenKeys).toEqual([]);
  // Captured output remains available after the scoped browser reset.
  await expect(page.getByLabel("Participant JSON")).toHaveValue(
    rebuiltParticipantText,
  );

  await logout(page);
  await login(page, OTHER_EMAIL);

  const crossOwnerStatus = await page.evaluate(async (id) => {
    const response = await fetch(
      `/api/learning-lab/v2/measurement?sessionId=${encodeURIComponent(id)}`,
      { cache: "no-store" },
    );
    return response.status;
  }, sessionId);
  expect(crossOwnerStatus).not.toBe(200);
});
