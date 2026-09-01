"use client";

import { Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";
import { useState, type ChangeEventHandler } from "react";

import { createBrowserSupabaseClient } from "@/adapters/supabase/browser-client";
import { MIN_PASSWORD_LENGTH } from "@/shared/contracts/auth";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { MfaChallenge } from "./mfa-challenge";

type PublicError = { messageVi?: string };
type PasswordMode = "sign-in" | "sign-up" | "forgot-password" | "check-email" | "mfa";

type SignInFlowProps = {
  intendedPath: string;
  initialError?: string;
  initialMfaRequired?: boolean;
  useFakeAuth: boolean;
};

type PasswordFieldProps = {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  describedBy?: string;
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M21.35 12.2c0-.64-.06-1.25-.16-1.84H12v3.48h5.26a4.5 4.5 0 0 1-1.95 2.96v2.26h3.17c1.86-1.71 2.87-4.23 2.87-6.86Z"
      />
      <path
        fill="#34A853"
        d="M12 21.75c2.64 0 4.86-.88 6.48-2.39l-3.17-2.46c-.88.59-2.01.94-3.31.94-2.54 0-4.7-1.72-5.47-4.02H3.26v2.34A9.78 9.78 0 0 0 12 21.75Z"
      />
      <path
        fill="#FBBC05"
        d="M6.53 13.82a5.88 5.88 0 0 1 0-3.64V7.84H3.26a9.76 9.76 0 0 0 0 8.32l3.27-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.16c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.85 3.23 14.64 2.25 12 2.25a9.78 9.78 0 0 0-8.74 5.59l3.27 2.34C7.3 7.88 9.46 6.16 12 6.16Z"
      />
    </svg>
  );
}

function PasswordField({
  id,
  label,
  name,
  value,
  onChange,
  autoComplete,
  disabled,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-describedby={describedBy}
          disabled={disabled}
          required
          className="pr-12"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[var(--muted-foreground)] outline-none hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
        >
          {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
        </button>
      </div>
    </div>
  );
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: PublicError };
    return body.error?.messageVi ?? "Yêu cầu chưa thể hoàn tất. Hãy thử lại.";
  } catch {
    return "Yêu cầu chưa thể hoàn tất. Hãy thử lại.";
  }
}

function authErrorMessage(
  error: { status?: number } | null,
  operation: "sign-in" | "sign-up" | "reset",
): string {
  if (error?.status === 429) return "Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại.";
  if (operation === "sign-in") return "Email hoặc mật khẩu không đúng.";
  if (operation === "sign-up") {
    return "Mật khẩu chưa đáp ứng yêu cầu. Hãy dùng mật khẩu dài hơn.";
  }
  return "Nếp chưa thể gửi hướng dẫn đặt lại mật khẩu. Hãy thử lại sau ít phút.";
}

export function SignInFlow({
  intendedPath,
  initialError = "",
  initialMfaRequired = false,
  useFakeAuth,
}: SignInFlowProps) {
  const [mode, setMode] = useState<PasswordMode>(initialMfaRequired ? "mfa" : "sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);

  function clearFeedback() {
    setError("");
    setMessage("");
  }

  function selectMode(nextMode: "sign-in" | "sign-up" | "forgot-password") {
    setMode(nextMode);
    clearFeedback();
  }

  function validateNewPassword(): boolean {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return false;
    }
    if (password !== passwordConfirmation) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return false;
    }
    return true;
  }

  async function mfaIsRequired(): Promise<boolean> {
    const { data, error: mfaError } =
      await createBrowserSupabaseClient().auth.mfa.getAuthenticatorAssuranceLevel();
    return !mfaError && data.currentLevel !== "aal2" && data.nextLevel === "aal2";
  }

  async function completeSignIn(requiresMfaChallenge: boolean) {
    if (requiresMfaChallenge) {
      setMode("mfa");
      return;
    }
    window.location.assign(intendedPath);
  }

  async function signInWithGoogle() {
    setGooglePending(true);
    clearFeedback();

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

  async function signIn() {
    setPending(true);
    clearFeedback();

    try {
      if (useFakeAuth) {
        const response = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, intendedPath }),
        });
        if (!response.ok) {
          setError(await readError(response));
          return;
        }
        const result = (await response.json()) as {
          redirectTo: string;
          requiresMfaChallenge: boolean;
        };
        await completeSignIn(result.requiresMfaChallenge);
        return;
      }

      const { error: signInError } = await createBrowserSupabaseClient().auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(authErrorMessage(signInError, "sign-in"));
        return;
      }
      await completeSignIn(await mfaIsRequired());
    } catch {
      setError("Không thể kết nối tới Nếp. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function signUp() {
    if (!validateNewPassword()) return;

    setPending(true);
    clearFeedback();

    try {
      if (useFakeAuth) {
        const response = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, passwordConfirmation, intendedPath }),
        });
        if (!response.ok) {
          setError(await readError(response));
          return;
        }
        const result = (await response.json()) as
          | { status: "confirmation_required" }
          | { status: "signed_in"; redirectTo: string; requiresMfaChallenge: boolean };
        if (result.status === "confirmation_required") {
          setMode("check-email");
          return;
        }
        await completeSignIn(result.requiresMfaChallenge);
        return;
      }

      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/start");
      const { data, error: signUpError } = await createBrowserSupabaseClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callbackUrl.toString() },
      });
      if (signUpError) {
        setError(authErrorMessage(signUpError, "sign-up"));
        return;
      }
      if (!data.session) {
        setMode("check-email");
        return;
      }
      await completeSignIn(await mfaIsRequired());
    } catch {
      setError("Không thể kết nối tới Nếp. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function requestPasswordReset() {
    setPending(true);
    clearFeedback();

    try {
      if (!useFakeAuth) {
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", "/reset-password");
        const { error: resetError } = await createBrowserSupabaseClient().auth.resetPasswordForEmail(
          email,
          { redirectTo: callbackUrl.toString() },
        );
        if (resetError) {
          setError(authErrorMessage(resetError, "reset"));
          return;
        }
      }
      // Generic copy prevents this screen from revealing whether an account exists.
      setMessage("Nếu email này có tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư đó.");
      setMode("check-email");
    } catch {
      setError("Không thể kết nối tới Nếp. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  if (mode === "mfa") return <MfaChallenge redirectTo={intendedPath} />;

  if (mode === "check-email") {
    return (
      <div className="space-y-5" aria-live="polite">
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--muted)] p-4">
          <Mail aria-hidden="true" className="mb-3 text-[var(--accent)]" size={22} />
          <h3 className="font-semibold">Kiểm tra hộp thư của bạn</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
            {message || "Chúng tôi đã gửi hướng dẫn tiếp theo tới email bạn vừa nhập."}
          </p>
        </div>
        <Button className="w-full" variant="secondary" onClick={() => selectMode("sign-in")}>
          Quay lại đăng nhập
        </Button>
      </div>
    );
  }

  const isSignUp = mode === "sign-up";
  const isForgotPassword = mode === "forgot-password";
  const submitLabel = isForgotPassword
    ? "Gửi hướng dẫn đặt lại"
    : isSignUp
      ? "Tạo tài khoản"
      : "Đăng nhập";

  return (
    <div className="space-y-5">
      {!isForgotPassword && !useFakeAuth ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-3"
            disabled={pending || googlePending}
            onClick={() => void signInWithGoogle()}
          >
            <GoogleMark />
            {googlePending ? "Đang chuyển tới Google…" : "Tiếp tục với Google"}
          </Button>
          <div className="flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              hoặc dùng email
            </span>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </>
      ) : null}

      {!isForgotPassword ? (
        <div
          className="grid grid-cols-2 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-1"
          aria-label="Chọn đăng nhập hoặc đăng ký"
        >
          <button
            type="button"
            aria-pressed={!isSignUp}
            aria-label="Chuyển sang đăng nhập"
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              !isSignUp ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"
            }`}
            onClick={() => selectMode("sign-in")}
          >
            Đăng nhập
          </button>
          <button
            type="button"
            aria-pressed={isSignUp}
            aria-label="Chuyển sang tạo tài khoản"
            className={`min-h-10 rounded-lg px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
              isSignUp ? "bg-[var(--card)] shadow-sm" : "text-[var(--muted-foreground)]"
            }`}
            onClick={() => selectMode("sign-up")}
          >
            Tạo tài khoản
          </button>
        </div>
      ) : null}

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (isForgotPassword) void requestPasswordReset();
          else if (isSignUp) void signUp();
          else void signIn();
        }}
      >
        {isForgotPassword ? (
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Đặt lại mật khẩu</h3>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              Nhập email tài khoản để nhận liên kết đặt lại mật khẩu.
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
            disabled={pending}
            required
          />
          {!isForgotPassword ? (
            <p id="email-help" className="text-sm text-[var(--muted-foreground)]">
              Dùng email bạn có thể mở để xác nhận tài khoản và khôi phục mật khẩu.
            </p>
          ) : null}
        </div>

        {!isForgotPassword ? (
          <>
            <PasswordField
              id="password"
              name="password"
              label="Mật khẩu"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              disabled={pending}
              describedBy={isSignUp ? "password-help" : error ? "auth-error" : undefined}
            />

            {isSignUp ? (
              <>
                <p id="password-help" className="text-sm text-[var(--muted-foreground)]">
                  Dùng ít nhất {MIN_PASSWORD_LENGTH} ký tự. Bạn không cần ghi nhớ một quy tắc ký tự phức tạp.
                </p>
                <PasswordField
                  id="password-confirmation"
                  name="passwordConfirmation"
                  label="Xác nhận mật khẩu"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  disabled={pending}
                  describedBy={error ? "auth-error" : undefined}
                />
              </>
            ) : (
              <button
                type="button"
                className="min-h-10 text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                onClick={() => selectMode("forgot-password")}
              >
                Quên mật khẩu?
              </button>
            )}
          </>
        ) : null}

        {error ? (
          <Alert id="auth-error" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Đang xử lý…" : submitLabel}
        </Button>
      </form>

      {isForgotPassword ? (
        <button
          type="button"
          className="min-h-10 w-full text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          onClick={() => selectMode("sign-in")}
        >
          Quay lại đăng nhập
        </button>
      ) : null}

      {!isForgotPassword ? (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm leading-5 text-[var(--muted-foreground)]">
          <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
          <p>Mật khẩu được xác minh bởi Supabase Auth. Sau khi đăng nhập, bạn vẫn có thể bật xác thực hai bước trong phần Bảo mật.</p>
        </div>
      ) : null}
    </div>
  );
}
