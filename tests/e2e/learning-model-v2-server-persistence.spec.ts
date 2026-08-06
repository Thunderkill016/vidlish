import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ retries: 0 });
test.skip(
  process.env.LEARNING_SESSION_REPOSITORY !== "supabase",
  "This specification is reserved for the isolated Supabase-backed CI job.",
);

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

async function postJson(
  page: Page,
  path: string,
  body?: Record<string, unknown>,
) {
  return page.evaluate(
    async ({ requestPath, requestBody }) => {
      const response = await fetch(requestPath, {
        method: "POST",
        headers: requestBody
          ? { "Content-Type": "application/json" }
          : undefined,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });
      return {
        status: response.status,
        body: (await response.json()) as Record<string, unknown>,
      };
    },
    { requestPath: path, requestBody: body },
  );
}

function sessionFrom(result: Awaited<ReturnType<typeof postJson>>) {
  return result.body.session as {
    id: string;
    status: string;
    currentPhase: string;
    currentActivityId: string;
  };
}

async function submit(
  page: Page,
  input: {
    sessionId: string;
    activityId: string;
    idempotencyKey: string;
    response: Record<string, unknown>;
  },
) {
  const result = await postJson(page, "/api/learning-lab/v2/attempts", input);
  expect([200, 201]).toContain(result.status);
  return result;
}

test("server-backed golden session preserves retry transfer and privacy boundaries", async ({
  page,
}) => {
  await login(page);

  const started = await postJson(page, "/api/learning-lab/v2/sessions");
  expect([200, 201]).toContain(started.status);
  const sessionId = sessionFrom(started).id;
  expect(sessionFrom(started)).toMatchObject({
    status: "in_progress",
    currentPhase: "gist",
    currentActivityId: "activity_gist",
  });

  const wrong = await submit(page, {
    sessionId,
    activityId: "activity_gist",
    idempotencyKey: "71111111-1111-4111-8111-111111111111",
    response: { kind: "choice", optionId: "option_camera_hardware" },
  });
  expect(wrong.body.evaluation).toMatchObject({ verdict: "incorrect" });
  expect(sessionFrom(wrong).currentActivityId).toBe("activity_gist");

  const correct = await submit(page, {
    sessionId,
    activityId: "activity_gist",
    idempotencyKey: "72222222-2222-4222-8222-222222222222",
    response: { kind: "choice", optionId: "option_embedded_player" },
  });
  expect(correct.body.created).toBe(true);
  expect(sessionFrom(correct)).toMatchObject({
    currentPhase: "practice",
    currentActivityId: "activity_meaning",
  });
  const correctAttemptId = (
    correct.body.persistedAttempt as { id: string }
  ).id;

  const networkRetry = await submit(page, {
    sessionId,
    activityId: "activity_gist",
    idempotencyKey: "72222222-2222-4222-8222-222222222222",
    response: { kind: "choice", optionId: "option_embedded_player" },
  });
  expect(networkRetry.status).toBe(200);
  expect(networkRetry.body.created).toBe(false);
  expect(
    (networkRetry.body.persistedAttempt as { id: string }).id,
  ).toBe(correctAttemptId);
  expect(sessionFrom(networkRetry).currentActivityId).toBe("activity_meaning");

  await submit(page, {
    sessionId,
    activityId: "activity_meaning",
    idempotencyKey: "73333333-3333-4333-8333-333333333333",
    response: { kind: "choice", optionId: "option_affiliation" },
  });

  const recall = await submit(page, {
    sessionId,
    activityId: "activity_recall",
    idempotencyKey: "74444444-4444-4444-8444-444444444444",
    response: { kind: "text", text: "a member of" },
  });
  const recallEvidence = (
    recall.body.persistedAttempt as {
      responseEvidence: Record<string, unknown>;
    }
  ).responseEvidence;
  expect(recallEvidence).toEqual({
    kind: "text",
    submitted: true,
    characterCount: "a member of".length,
  });
  expect(recallEvidence).not.toHaveProperty("text");

  const transferPending = await submit(page, {
    sessionId,
    activityId: "activity_transfer",
    idempotencyKey: "75555555-5555-4555-8555-555555555555",
    response: {
      kind: "self_check",
      text: "I'm a member of the release team.",
      checkedCriteria: [],
    },
  });
  expect(sessionFrom(transferPending)).toMatchObject({
    currentPhase: "transfer",
    currentActivityId: "activity_transfer",
  });

  const transferConfirmed = await submit(page, {
    sessionId,
    activityId: "activity_transfer",
    idempotencyKey: "76666666-6666-4666-8666-666666666666",
    response: {
      kind: "self_check",
      text: "I'm a member of the release team.",
      checkedCriteria: [0, 1, 2],
    },
  });
  expect(sessionFrom(transferConfirmed)).toMatchObject({
    currentPhase: "reflect",
    currentActivityId: "activity_exit",
  });
  const transferEvidence = (
    transferConfirmed.body.persistedAttempt as {
      responseEvidence: Record<string, unknown>;
    }
  ).responseEvidence;
  expect(transferEvidence).toMatchObject({
    kind: "self_check",
    submitted: true,
    checkedCriteria: [0, 1, 2],
  });
  expect(transferEvidence).not.toHaveProperty("text");

  const completed = await submit(page, {
    sessionId,
    activityId: "activity_exit",
    idempotencyKey: "77777777-7777-4777-8777-777777777778",
    response: {
      kind: "reflection",
      text: "Tôi nghe rõ cụm a member of hơn lần đầu.",
    },
  });
  expect(sessionFrom(completed)).toMatchObject({
    status: "completed",
    currentPhase: "completed",
    currentActivityId: "activity_exit",
  });
  const exitEvidence = (
    completed.body.persistedAttempt as {
      responseEvidence: Record<string, unknown>;
    }
  ).responseEvidence;
  expect(exitEvidence).toMatchObject({
    kind: "reflection",
    submitted: true,
  });
  expect(exitEvidence).not.toHaveProperty("text");
});
