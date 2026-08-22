import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import process from "node:process";

export const GOLDEN_STUDY_EMAIL = "learning-preview@example.com";
export const GOLDEN_STUDY_CODE = "123456";
export const GOLDEN_STUDY_LESSON_VERSION_ID =
  "77777777-7777-4777-8777-777777777777";
export const GOLDEN_STUDY_HOST = "127.0.0.1";
export const GOLDEN_STUDY_PORT = 3200;
export const GOLDEN_STUDY_READY_TIMEOUT_MS = 30_000;

const GOLDEN_STUDY_READY_POLL_MS = 100;
const GOLDEN_STUDY_READY_REQUEST_TIMEOUT_MS = 1_000;

const REQUIRED_LOCAL_SUPABASE_KEYS = [
  "API_URL",
  "ANON_KEY",
  "SERVICE_ROLE_KEY",
  "DB_URL",
];

const EXTERNAL_SECRET_KEYS = [
  "GEMINI_API_KEY",
  "SUPADATA_API_KEY",
  "YOUTUBE_DATA_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL_NON_POOLING",
];

function unquoteShellValue(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function parseSupabaseStatusEnv(output) {
  const parsed = {};
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals <= 0) continue;
    const key = line.slice(0, equals).trim();
    const value = unquoteShellValue(line.slice(equals + 1));
    if (key) parsed[key] = value;
  }

  const missing = REQUIRED_LOCAL_SUPABASE_KEYS.filter((key) => !parsed[key]);
  if (missing.length > 0) {
    throw new Error(
      `Local Supabase status is missing required values: ${missing.join(", ")}.`,
    );
  }
  return parsed;
}

export function buildGoldenStudyRuntimeEnv(baseEnv, localSupabase) {
  const env = { ...baseEnv };

  for (const key of EXTERNAL_SECRET_KEYS) delete env[key];

  // The child app must use the clean local instance even when the parent shell
  // is configured for production or another Supabase project.
  env.NEXT_PUBLIC_SUPABASE_URL = localSupabase.API_URL;
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = localSupabase.ANON_KEY;
  env.SUPABASE_SECRET_KEY = localSupabase.SERVICE_ROLE_KEY;

  env.AUTH_ADAPTER = "fake";
  env.AUTH_FAKE_CODE = GOLDEN_STUDY_CODE;
  env.TEST_BETA_EMAILS = GOLDEN_STUDY_EMAIL;

  env.LEARNING_SESSION_REPOSITORY = "supabase";
  env.GENERATION_REPOSITORY = "supabase";
  env.TRANSCRIPT_REPOSITORY = "supabase";
  env.LEARNING_LAB_V2_LESSON_VERSION_ID = GOLDEN_STUDY_LESSON_VERSION_ID;

  // External inputs are fixtures or disabled. The moderated study is about the
  // learning loop, not provider availability, and must never spend quota.
  env.VIDEO_METADATA_ADAPTER = "fixture";
  env.TRANSCRIPT_NATIVE_ADAPTER = "fixture";
  env.TRANSCRIPT_NATIVE_ENABLED = "true";
  env.LESSON_PROVIDER = "fixture";
  env.LEARNING_AUTHORING_PROVIDER = "off";
  env.GENERATION_DISPATCHER = "inline";
  env.NEXT_PUBLIC_AUTH_RESEND_COOLDOWN_SECONDS = "1";

  // A parent CI shell should not make the local operator server behave like a
  // production process. `next dev` sets NODE_ENV itself; removing these avoids
  // inherited build/test switches changing runtime guards.
  delete env.CI;
  delete env.NODE_ENV;

  return env;
}

export function assertStudyPortAvailable({
  host = GOLDEN_STUDY_HOST,
  port = GOLDEN_STUDY_PORT,
} = {}) {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", (error) => {
      if (error && typeof error === "object" && error.code === "EADDRINUSE") {
        reject(
          new Error(
            `Golden study port ${host}:${port} is already in use. Stop the old study/app process before starting a fresh participant cycle.`,
          ),
        );
        return;
      }
      reject(error);
    });

    probe.listen({ host, port, exclusive: true }, () => {
      probe.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });
}

export async function waitForStudyAppReady(
  child,
  {
    origin = `http://${GOLDEN_STUDY_HOST}:${GOLDEN_STUDY_PORT}`,
    timeoutMs = GOLDEN_STUDY_READY_TIMEOUT_MS,
    pollIntervalMs = GOLDEN_STUDY_READY_POLL_MS,
    requestTimeoutMs = GOLDEN_STUDY_READY_REQUEST_TIMEOUT_MS,
    fetchImpl = globalThis.fetch,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;
  let childFailure = null;

  const onExit = (code, signal) => {
    childFailure = new Error(
      `Vidlish exited before becoming ready${signal ? ` from signal ${signal}` : ` with exit code ${code ?? "unknown"}`}.`,
    );
  };
  const onError = (error) => {
    childFailure = new Error(`Could not start Vidlish: ${error.message}`);
  };

  child.once("exit", onExit);
  child.once("error", onError);

  try {
    while (Date.now() < deadline) {
      if (childFailure) throw childFailure;

      const remainingMs = deadline - Date.now();
      try {
        const response = await fetchImpl(`${origin}/sign-in`, {
          cache: "no-store",
          signal: AbortSignal.timeout(
            Math.max(1, Math.min(requestTimeoutMs, remainingMs)),
          ),
        });
        if (childFailure) throw childFailure;
        if (response.ok) return;
      } catch (error) {
        if (childFailure) throw childFailure;
        // Connection refusal/timeout is expected while Next.js is booting.
        // The bounded outer deadline remains the authority for readiness.
        void error;
      }

      const waitMs = Math.min(pollIntervalMs, deadline - Date.now());
      if (waitMs > 0) await sleep(waitMs);
    }

    if (childFailure) throw childFailure;
    throw new Error(
      `Vidlish did not become ready at ${origin} within ${timeoutMs}ms. The participant cycle was not declared ready.`,
    );
  } finally {
    child.off("exit", onExit);
    child.off("error", onError);
  }
}

function run(command, args, options = {}) {
  const stdio = options.capture
    ? ["ignore", "pipe", "pipe"]
    : options.quiet
      ? "ignore"
      : "inherit";
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio,
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture
      ? `${result.stderr || result.stdout || ""}`.trim()
      : "";
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status}${detail ? `: ${detail}` : ""}.`,
    );
  }
  return options.capture ? result.stdout : "";
}

function assertCommand(name, versionArgs = ["--version"]) {
  const result = spawnSync(name, versionArgs, {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${name} is required for the Golden study harness but was not found.`,
    );
  }
}

function prepareLocalStudyDatabase() {
  assertCommand("supabase");
  assertCommand("psql", ["--version"]);

  console.log("[study:golden] Starting local Supabase...");
  // `supabase start` normally prints local API/service keys. They are local but
  // still credentials, so the operator harness keeps that command quiet.
  run("supabase", ["start"], { quiet: true });

  console.log("[study:golden] Resetting local database for one fresh participant...");
  run("supabase", ["db", "reset", "--local", "--yes", "--no-seed"]);

  const status = parseSupabaseStatusEnv(
    run("supabase", ["status", "-o", "env"], { capture: true }),
  );

  console.log("[study:golden] Loading the existing durable Golden fixture...");
  run(
    "psql",
    [
      status.DB_URL,
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      "supabase/fixtures/learning_model_v2_durable.sql",
    ],
    { env: process.env },
  );

  return status;
}

function printOperatorInstructions() {
  const origin = `http://${GOLDEN_STUDY_HOST}:${GOLDEN_STUDY_PORT}`;
  console.log("");
  console.log("Golden Session study harness is ready for ONE real participant.");
  console.log(`Sign in:  ${origin}/sign-in`);
  console.log(`Lesson:   ${origin}/learning-lab/v2`);
  console.log(`Capture:  ${origin}/learning-lab/v2/usability/capture`);
  console.log(`Evaluate: ${origin}/learning-lab/v2/usability`);
  console.log(`Fixture email: ${GOLDEN_STUDY_EMAIL}`);
  console.log(`Fixture OTP:   ${GOLDEN_STUDY_CODE}`);
  console.log("");
  console.log(
    "After copying this participant JSON, stop this process and run `pnpm study:golden` again before the next participant.",
  );
  console.log(
    "The reset is part of the protocol: it prevents server-side learning state from leaking between real participants.",
  );
  console.log("This harness does not create participants or pass Gate 5 by itself.");
  console.log("");
}

export async function main() {
  let child = null;

  try {
    // Refuse an ambiguous cycle before touching the participant database. If an
    // old server still owns the study port, its UI must never be mistaken for
    // the fresh cycle this command is about to create.
    await assertStudyPortAvailable();

    const status = prepareLocalStudyDatabase();
    const childEnv = buildGoldenStudyRuntimeEnv(process.env, status);

    console.log("[study:golden] Starting Vidlish and waiting for readiness...");
    child = spawn(
      "pnpm",
      [
        "dev",
        "--hostname",
        GOLDEN_STUDY_HOST,
        "--port",
        String(GOLDEN_STUDY_PORT),
      ],
      {
        cwd: process.cwd(),
        env: childEnv,
        stdio: "inherit",
      },
    );

    const forward = (signal) => {
      if (!child.killed) child.kill(signal);
    };
    process.on("SIGINT", () => forward("SIGINT"));
    process.on("SIGTERM", () => forward("SIGTERM"));

    child.on("error", (error) => {
      console.error(`[study:golden] Could not start Vidlish: ${error.message}`);
      process.exitCode = 1;
    });
    child.on("exit", (code, signal) => {
      if (signal) process.exitCode = 1;
      else process.exitCode = code ?? 0;
    });

    await waitForStudyAppReady(child);
    printOperatorInstructions();
  } catch (error) {
    if (child && !child.killed) child.kill("SIGTERM");
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[study:golden] ${message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
