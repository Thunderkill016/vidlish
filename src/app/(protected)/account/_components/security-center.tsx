"use client";

import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/adapters/supabase/browser-client";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type SecurityCenterProps = { email: string };
type Factor = { id: string; friendly_name?: string; status: string };

export function SecurityCenter({ email }: SecurityCenterProps) {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollment, setEnrollment] = useState<{ id: string; qrCode: string }>();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadFactors() {
    try {
      const { data, error: listError } = await createBrowserSupabaseClient().auth.mfa.listFactors();
      if (listError || !data) {
        setError("Không thể tải trạng thái xác thực hai bước. Hãy thử lại.");
        return;
      }
      setFactors(data.totp.filter((factor) => factor.status === "verified"));
    } catch {
      setError("Không thể tải trạng thái xác thực hai bước. Hãy thử lại.");
    }
  }

  useEffect(() => {
    let active = true;
    async function loadInitialFactors() {
      try {
        const { data, error: listError } = await createBrowserSupabaseClient().auth.mfa.listFactors();
        if (!active) return;
        if (listError) setError("Không thể tải trạng thái xác thực hai bước. Hãy thử lại.");
        else setFactors(data.totp.filter((factor) => factor.status === "verified"));
      } catch {
        if (active) setError("Không thể tải trạng thái xác thực hai bước. Hãy thử lại.");
      }
    }
    void loadInitialFactors();
    return () => {
      active = false;
    };
  }, []);

  async function enroll() {
    setPending(true);
    setError("");
    try {
      const { data, error: enrollError } = await createBrowserSupabaseClient().auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Ứng dụng xác thực Nếp",
        issuer: "Nếp",
      });
      if (enrollError || !data.totp) setError("Không thể bắt đầu thiết lập ứng dụng xác thực.");
      else setEnrollment({ id: data.id, qrCode: data.totp.qr_code });
    } catch {
      setError("Không thể bắt đầu thiết lập ứng dụng xác thực. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function verifyEnrollment() {
    if (!enrollment) return;
    setPending(true);
    setError("");
    try {
      const { error: verifyError } = await createBrowserSupabaseClient().auth.mfa.challengeAndVerify({
        factorId: enrollment.id,
        code,
      });
      if (verifyError) setError("Mã xác thực không đúng hoặc đã hết hạn. Hãy thử lại.");
      else {
        setEnrollment(undefined);
        setCode("");
        setMessage("Đã bật xác thực hai bước cho tài khoản này.");
        await loadFactors();
      }
    } catch {
      setError("Không thể xác thực mã lúc này. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function signOutOtherDevices() {
    setPending(true);
    setError("");
    try {
      const { error: signOutError } = await createBrowserSupabaseClient().auth.signOut({ scope: "others" });
      if (signOutError) setError("Không thể đăng xuất các thiết bị khác. Hãy thử lại.");
      else setMessage("Các phiên đăng nhập khác đã được đăng xuất.");
    } catch {
      setError("Không thể đăng xuất các thiết bị khác. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  async function unenroll(factorId: string) {
    setPending(true);
    setError("");
    try {
      const { error: unenrollError } = await createBrowserSupabaseClient().auth.mfa.unenroll({ factorId });
      if (unenrollError) setError("Cần xác thực hai bước trong phiên hiện tại trước khi xóa factor này.");
      else {
        setMessage("Đã xóa ứng dụng xác thực.");
        await loadFactors();
      }
    } catch {
      setError("Không thể xóa ứng dụng xác thực. Hãy thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-[var(--accent)]">Tài khoản</p>
        <h1 className="text-3xl font-bold tracking-tight">Bảo mật tài khoản</h1>
        <p className="text-[var(--muted-foreground)]">{email}</p>
      </header>
      {message ? <Alert><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
      <Card className="space-y-4">
        <div><h2 className="text-xl font-bold">Xác thực hai bước</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Dùng ứng dụng xác thực để bảo vệ tài khoản khi đăng nhập.</p></div>
        {enrollment ? (
          <div className="space-y-4">
            {/* QR is an ephemeral TOTP enrollment secret, not a CDN asset. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-48 rounded-lg border border-[var(--border)] bg-white p-2" src={`data:image/svg+xml;utf-8,${enrollment.qrCode}`} alt="Mã QR để thêm Nếp vào ứng dụng xác thực" />
            <div className="space-y-2"><Label htmlFor="totp-code">Mã gồm 6 chữ số từ ứng dụng</Label><Input id="totp-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
            <Button onClick={() => void verifyEnrollment()} disabled={pending || code.length !== 6}>Xác nhận và bật</Button>
          </div>
        ) : factors.length === 0 ? <Button onClick={() => void enroll()} disabled={pending}>Bật ứng dụng xác thực</Button> : (
          <div className="space-y-3"><p className="text-sm font-semibold text-[var(--solved)]">Đã bật cho {factors.length} ứng dụng</p>{factors.map((factor) => <div key={factor.id} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--muted)] p-3 text-sm"><span>{factor.friendly_name ?? "Ứng dụng xác thực"}</span><Button variant="secondary" onClick={() => void unenroll(factor.id)} disabled={pending}>Xóa</Button></div>)}</div>
        )}
      </Card>
      <Card className="space-y-3"><h2 className="text-xl font-bold">Thiết bị khác</h2><p className="text-sm text-[var(--muted-foreground)]">Đăng xuất mọi phiên khác nếu bạn nghi ngờ tài khoản đã bị truy cập.</p><Button variant="secondary" onClick={() => void signOutOtherDevices()} disabled={pending}>Đăng xuất thiết bị khác</Button></Card>
    </div>
  );
}
