"use client";

import { useEffect, useRef, useState } from "react";

import { createBrowserSupabaseClient } from "@/adapters/supabase/browser-client";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type MfaChallengeProps = {
  redirectTo: string;
};

export function MfaChallenge({ redirectTo }: MfaChallengeProps) {
  const [factorId, setFactorId] = useState<string>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function loadFactor() {
      try {
        const { data, error: listError } = await createBrowserSupabaseClient().auth.mfa.listFactors();
        if (!active) return;
        if (listError) {
          setError("Không thể kiểm tra ứng dụng xác thực. Hãy đăng nhập lại.");
        } else {
          const factor = data?.totp.find((item) => item.status === "verified");
          if (!factor) setError("Không tìm thấy ứng dụng xác thực đã được bật cho tài khoản này.");
          else setFactorId(factor.id);
        }
      } catch {
        if (active) setError("Không thể kiểm tra ứng dụng xác thực. Hãy đăng nhập lại.");
      } finally {
        if (!active) return;
        setLoading(false);
        window.setTimeout(() => codeRef.current?.focus(), 0);
      }
    }
    void loadFactor();
    return () => {
      active = false;
    };
  }, []);

  async function verifyMfa() {
    if (!factorId) return;
    setPending(true);
    setError("");
    try {
      const { error: verifyError } = await createBrowserSupabaseClient().auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (verifyError) {
        setError("Mã xác thực không đúng hoặc đã hết hạn. Hãy thử lại.");
        return;
      }
      window.location.assign(redirectTo);
    } catch {
      setError("Không thể xác thực mã lúc này. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void verifyMfa();
      }}
      noValidate
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Xác thực hai bước</p>
        <h3 className="text-xl font-bold">Mở ứng dụng xác thực của bạn</h3>
        <p className="text-sm leading-6 text-[var(--muted-foreground)]">
          Nhập mã gồm 6 chữ số để hoàn tất đăng nhập. Không chia sẻ mã này cho bất kỳ ai.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="mfa-code">Mã xác thực gồm 6 chữ số</Label>
        <Input
          ref={codeRef}
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={loading || pending}
          required
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button className="w-full" type="submit" disabled={loading || pending || code.length !== 6}>
        {pending ? "Đang xác thực…" : "Xác thực và tiếp tục"}
      </Button>
    </form>
  );
}
