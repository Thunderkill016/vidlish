"use client";

import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/adapters/supabase/browser-client";
import { MIN_PASSWORD_LENGTH } from "@/shared/contracts/auth";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type ResetPasswordFlowProps = {
  useFakeAuth: boolean;
};

export function ResetPasswordFlow({ useFakeAuth }: ResetPasswordFlowProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function updatePassword() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Mật khẩu cần ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`);
      return;
    }
    if (password !== passwordConfirmation) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }

    setPending(true);
    setError("");
    try {
      if (!useFakeAuth) {
        const { error: updateError } = await createBrowserSupabaseClient().auth.updateUser({
          password,
        });
        if (updateError) {
          setError(
            updateError.status === 429
              ? "Bạn đã thử quá nhiều lần. Hãy chờ một lúc rồi thử lại."
              : "Không thể cập nhật mật khẩu. Hãy dùng mật khẩu dài hơn hoặc thử lại sau.",
          );
          return;
        }
      }
      window.location.assign("/start");
    } catch {
      setError("Không thể kết nối tới Nếp. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void updatePassword();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="new-password">Mật khẩu mới</Label>
        <div className="relative">
          <Input
            id="new-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-describedby={error ? "password-reset-error" : "new-password-help"}
            disabled={pending}
            required
            className="pr-12"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-[var(--muted-foreground)] outline-none hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={visible}
            onClick={() => setVisible((current) => !current)}
            disabled={pending}
          >
            {visible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </div>
        <p id="new-password-help" className="text-sm text-[var(--muted-foreground)]">
          Dùng ít nhất {MIN_PASSWORD_LENGTH} ký tự.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password-confirmation">Xác nhận mật khẩu mới</Label>
        <Input
          id="new-password-confirmation"
          name="passwordConfirmation"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          value={passwordConfirmation}
          onChange={(event) => setPasswordConfirmation(event.target.value)}
          aria-describedby={error ? "password-reset-error" : undefined}
          disabled={pending}
          required
        />
      </div>

      {error ? (
        <Alert id="password-reset-error" variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? "Đang cập nhật…" : "Lưu mật khẩu mới"}
      </Button>

      <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] p-3 text-sm leading-5 text-[var(--muted-foreground)]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
        <p>Mật khẩu mới được gửi trực tiếp đến Supabase Auth để cập nhật phiên đăng nhập này.</p>
      </div>
    </form>
  );
}
