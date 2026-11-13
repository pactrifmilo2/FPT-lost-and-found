import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

function isVerifiedSession(token: string) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload)).aal === "aal2";
  } catch {
    return false;
  }
}

export function AdminMfaGate({ children }: { children: ReactNode }) {
  const { profile, session, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState(false);
  if (profile?.role !== "admin" || !session) return <>{children}</>;
  // This decides which screen to render. Supabase enforces AAL2 independently.
  if (isVerifiedSession(session.access_token)) return <>{children}</>;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <AdminMfaForm key={profile.id} userId={profile.id} />
      <button
        type="button"
        className="mt-4 text-sm text-brand-700 underline"
        onClick={() => void signOut().catch(() => setSignOutError(true))}
      >
        Đăng xuất
      </button>
      {signOutError && (
        <p role="alert">Không đăng xuất được. Vui lòng thử lại.</p>
      )}
    </main>
  );
}

function AdminMfaForm({ userId }: { userId: string }) {
  const [enrollment, setEnrollment] = useState<{ id: string; qr: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const factors = useQuery({
    queryKey: ["admin-mfa-factors", userId],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });
  const factorId = factors.data?.totp[0]?.id ?? enrollment?.id;

  async function setup() {
    if (!factors.data) return;
    setError("");
    setBusy(true);
    try {
      for (const factor of factors.data.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified") {
          const result = await supabase.auth.mfa.unenroll({
            factorId: factor.id,
          });
          if (result.error) throw result.error;
        }
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Lost & Found",
        issuer: "Lost & Found",
      });
      if (error) throw error;
      setEnrollment({ id: data.id, qr: data.totp.qr_code });
    } catch {
      setError("Không tạo được mã QR. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) return;
    setError("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (error) throw error;
    } catch {
      setError("Không xác minh được mã. Hãy kiểm tra và thử mã mới.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={verify} className="card space-y-4 p-6">
      <h1 className="text-xl font-bold">Xác thực hai bước</h1>
      {factors.isPending && <p role="status">Đang tải phương thức xác thực…</p>}
      {factors.isError && (
        <div role="alert" className="space-y-2">
          <p>Không tải được phương thức xác thực.</p>
          <Button type="button" onClick={() => void factors.refetch()}>
            Thử lại
          </Button>
        </div>
      )}
      {factors.data && !factorId && (
        <>
          <p className="text-sm text-slate-600">
            Dùng ứng dụng xác thực để thiết lập bước bảo mật cho tài khoản quản
            trị.
          </p>
          <Button type="button" disabled={busy} onClick={() => void setup()}>
            Tạo mã QR
          </Button>
        </>
      )}
      {enrollment && (
        <>
          <p className="text-sm text-slate-600">
            Quét mã QR bằng ứng dụng xác thực rồi nhập mã 6 chữ số.
          </p>
          <img
            src={enrollment.qr}
            alt="Mã QR thiết lập xác thực hai bước"
            className="mx-auto h-44 w-44"
          />
        </>
      )}
      {factorId && (
        <>
          <Field label="Mã từ ứng dụng xác thực" required>
            <input
              className="input"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
            />
          </Field>
          <Button disabled={busy}>Xác minh</Button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  );
}
