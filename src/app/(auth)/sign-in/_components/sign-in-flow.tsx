"use client";

import { useEffect, useRef, useState } from "react";

import { createBrowserSupabaseClient } from "@/adapters/supabase/browser-client";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

type PublicError = { messageVi?: string };

type SignInFlowProps = {
  intendedPath: string;
  cooldownSeconds: number;
  initialError?: string;
};

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: PublicError };
    return body.error?.messageVi ?? "Yêu cầu chưa thể hoàn tất. Hãy thử lại.";
  } catch {
    return "Yêu cầu chưa thể hoàn tất. Hãy thử lại.";
  }
}

export function SignInFlow({
  intendedPath,
  cooldownSeconds,
  initialError = "",
}: SignInFlowProps) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  async function signInWithGoogle() {
    setGooglePending(true);
    setError("");
    setMessage("");

    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", intendedPath);

      const { error: oauthError } = await createBrowserSupabaseClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callbackUrl.toString() },
      });

      if (oauthError) {
        setError("Không thể bắt đầu đăng nhập Google. Hãy thử lại.");
        setGooglePending(false);
      }
    } catch {
      setError("Không thể kết nối tới Google. Hãy thử lại.");
      setGooglePending(false);
    }
  }

  async function requestCode() {
    setPending(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      setStep("code");
      setRemaining(cooldownSeconds);
      setMessage("Nếu email của bạn được mời, mã đăng nhập sẽ được gửi.");
    } catch {
      setError("Không thể kết nối tới Vidlish. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function verifyCode() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, intendedPath }),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const result = (await response.json()) as { redirectTo: string };
      window.location.assign(result.redirectTo);
    } catch {
      setError("Không thể kết nối tới Vidlish. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return step === "email" ? (
    <div className="space-y-5">
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending || googlePending}
        onClick={() => void signInWithGoogle()}
      >
        {googlePending ? "Đang chuyển tới Google…" : "Đăng nhập bằng Google"}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          hoặc
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void requestCode();
        }}
        noValidate
      >
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-semibold">
            Email được mời
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={error ? "auth-error" : "email-help"}
            aria-invalid={Boolean(error)}
            disabled={pending || googlePending}
            required
          />
          <p id="email-help" className="text-sm text-[var(--muted-foreground)]">
            Vidlish đang mở theo lời mời trong giai đoạn private beta.
          </p>
        </div>

        {error ? (
          <p id="auth-error" role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending || googlePending}>
          {pending ? "Đang gửi mã…" : "Gửi mã đăng nhập"}
        </Button>
      </form>
    </div>
  ) : (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void verifyCode();
      }}
      noValidate
    >
      <div className="space-y-1">
        <p className="text-sm text-[var(--muted-foreground)]">Mã được gửi cho</p>
        <p className="break-all font-semibold">{email}</p>
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
            setMessage("");
          }}
        >
          Dùng email khác
        </button>
      </div>

      <div className="space-y-2">
        <label htmlFor="code" className="block text-sm font-semibold">
          Mã đăng nhập gồm 6 chữ số
        </label>
        <Input
          ref={codeRef}
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          aria-describedby={error ? "auth-error" : "code-status"}
          aria-invalid={Boolean(error)}
          disabled={pending}
          required
        />
      </div>

      <div id="code-status" aria-live="polite" className="text-sm text-[var(--muted-foreground)]">
        {message}
      </div>

      {error ? (
        <p id="auth-error" role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending || code.length !== 6}>
        {pending ? "Đang xác minh…" : "Đăng nhập"}
      </Button>

      <Button
        variant="secondary"
        className="w-full"
        disabled={pending || remaining > 0}
        onClick={() => void requestCode()}
      >
        {remaining > 0 ? `Gửi lại sau ${remaining}s` : "Gửi lại mã"}
      </Button>
    </form>
  );
}
