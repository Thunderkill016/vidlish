import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email được mời").fill("invited@example.com");
  await page.getByRole("button", { name: "Gửi mã đăng nhập" }).click();
  await page.getByLabel("Mã đăng nhập gồm 6 chữ số").fill("123456");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/create$/);
}

const sessionIds = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
  "44444444-4444-4444-8444-444444444444",
  "55555555-5555-4555-8555-555555555555",
] as const;

function participant(index: number) {
  return {
    measurement: {
      sessionId: sessionIds[index],
      status: "completed",
      sessionViewed: true,
      completed: true,
      observedElapsedSeconds: 300 + index * 20,
      lastKnownActivityId: "exit_ticket",
      incompleteAtLastKnownActivity: null,
      firstSource: {
        activityId: "source_listen",
        playStarted: true,
        playCompleted: true,
        replayed: index === 0,
      },
      gist: {
        activityId: "gist_choice",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      targetNotice: {
        activityId: "meaning_notice",
        attempted: true,
      },
      correction: {
        incorrectAttemptCount: 0,
        shownCount: 0,
      },
      retrieval: {
        activityId: "chunk_recall",
        attemptCount: 1,
        latestVerdict: "correct",
        correctCount: 1,
      },
      transfer: {
        activityId: "guided_transfer",
        attemptCount: 1,
        latestVerdict: "self_check",
        correctCount: 0,
      },
      afterListen: {
        activityId: "exit_ticket",
        attemptCount: 1,
        latestVerdict: "unscored",
        correctCount: 0,
      },
      supportByActivity: [],
      totalSupportStepsOpened: 0,
      runtimeErrors: [],
    },
    observation: {
      participantCode: `p${index + 1}`,
      platform: index % 2 === 0 ? "mobile" : "desktop",
      completedWithoutModeratorInstruction: true,
      lessonGoalRestated: index < 4,
      beforeTargetRecognition: index < 3 ? "not_recognized" : "recognized",
      afterTargetRecognition: "recognized",
      blocked: false,
      blockKind: null,
      severeDefectKind: null,
    },
  };
}

test("internal usability evaluator rejects arbitrary notes, imports five local files and reports the predeclared gate", async ({
  page,
}) => {
  await login(page);
  await page.goto("/learning-lab/v2/usability");

  await expect(
    page.getByRole("heading", { name: "Golden Session usability gate" }),
  ).toBeVisible();

  const validStudy = {
    participants: sessionIds.map((_, index) => participant(index)),
  };
  const invalidStudy = structuredClone(validStudy) as typeof validStudy & {
    participants: Array<
      (typeof validStudy.participants)[number] & {
        observation: (typeof validStudy.participants)[number]["observation"] & {
          notes?: string;
        };
      }
    >;
  };
  invalidStudy.participants[0]!.observation.notes = "raw learner answer";

  const textarea = page.getByLabel("Study JSON");
  await textarea.fill(JSON.stringify(invalidStudy));
  await page.getByRole("button", { name: "Đánh giá 5 phiên" }).click();
  const validationAlert = page
    .getByRole("alert")
    .filter({ hasText: "Unrecognized key" });
  await expect(validationAlert).toContainText("Không thể đánh giá");
  await expect(validationAlert).toContainText("Unrecognized key");

  const participantFiles = validStudy.participants.map((value, index) => ({
    name: `participant-p${index + 1}.json`,
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(value), "utf8"),
  }));
  await page
    .getByLabel("Import exactly five participant JSON files")
    .setInputFiles(participantFiles);

  await expect(page.getByRole("status")).toContainText(
    "Đã nạp p1, p2, p3, p4, p5",
  );
  const importedStudy = JSON.parse(await textarea.inputValue()) as typeof validStudy;
  expect(importedStudy).toEqual(validStudy);

  await page.getByRole("button", { name: "Đánh giá 5 phiên" }).click();

  await expect(page.getByText("Kết luận usability gate")).toBeVisible();
  await expect(page.getByText("PASS", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("4/4 yêu cầu")).toBeVisible();
  await expect(page.getByText("3/3 yêu cầu")).toBeVisible();
  await expect(page.getByText("340s (yêu cầu 240–480s)")).toBeVisible();
});
