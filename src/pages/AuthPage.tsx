import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import type { Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getOAuthProviders,
  type OAuthProviders,
} from "@/lib/api/authProviders";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
import { onboardingDestination } from "@/lib/onboarding";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
type Mode = "login" | "signup" | "forgot" | "reset" | "callback";
const titles: Record<Mode, string> = {
  login: "Đăng nhập",
  signup: "Đăng ký",
  forgot: "Khôi phục mật khẩu",
  reset: "Đặt mật khẩu mới",
  callback: "Xác nhận email",
};
export function AuthPage({ mode }: { mode: Mode }) {
  const auth = useAuth(),
    location = useLocation(),
    navigate = useNavigate();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [messageKind, setMessageKind] = useState<"success" | "info">("info");
  const [providers, setProviders] = useState<OAuthProviders>({
    google: false,
    facebook: false,
  });
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const from = onboardingDestination(
    mode === "callback"
      ? new URLSearchParams(location.search).get("next")
      : (rawFrom ?? null),
  );
  useEffect(() => {
    if (mode !== "login" && mode !== "signup") return;
    const controller = new AbortController();
    void getOAuthProviders(controller.signal)
      .then((enabled) => setProviders(enabled))
      .catch(() => {});
    return () => controller.abort();
  }, [mode]);
  if (
    auth.session &&
    auth.profile &&
    !auth.loading &&
    !auth.recovery &&
    (mode === "login" || mode === "signup" || mode === "callback")
  )
    return <Navigate to={from} replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    setMessageKind("info");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (
          data.user?.identities?.some(
            (identity) => identity.provider === "email",
          )
        ) {
          setMessageKind("success");
          setMessage(
            "Đã gửi email xác nhận. Hãy kiểm tra hộp thư và thư rác trước khi đăng nhập.",
          );
        } else {
          setMessage(
            "Không có email xác nhận mới được gửi. Nếu bạn đã có tài khoản, hãy đăng nhập hoặc khôi phục mật khẩu.",
          );
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (error) throw error;
        setMessageKind("info");
        setMessage(
          "Nếu tài khoản tồn tại, hướng dẫn khôi phục sẽ được gửi đến email của bạn.",
        );
      } else if (mode === "reset") {
        if (!auth.session) throw new Error("AUTH_REQUIRED");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        auth.finishRecovery();
        navigate("/", { replace: true });
      }
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function socialSignIn(provider: Provider) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", from);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: callback.toString() },
      });
      if (error) throw error;
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const callbackError =
    new URLSearchParams(location.hash.slice(1)).get("error_description") ||
    new URLSearchParams(location.search).get("error_description");
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <Link
        to="/"
        className="mb-6 text-center text-2xl font-extrabold text-brand-700"
      >
        FPT Lost &amp; Found
      </Link>
      <div className="card space-y-5 p-6">
        <h1 className="text-xl font-bold">{titles[mode]}</h1>
        {!!(error || callbackError || auth.error) && (
          <p role="alert" className="text-sm text-red-700">
            {error ||
              (callbackError
                ? "Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng ký hoặc khôi phục mật khẩu lại."
                : errorMessage(auth.error))}
          </p>
        )}
        {message && (
          <p
            role="status"
            className={`text-sm ${messageKind === "success" ? "text-green-700" : "text-slate-700"}`}
          >
            {message}
          </p>
        )}
        {mode === "callback" ? (
          <>
            <p>
              {auth.loading
                ? "Đang xác nhận…"
                : "Bạn có thể đăng nhập sau khi xác nhận email."}
            </p>
            <Link to="/login">Đăng nhập</Link>
          </>
        ) : mode === "reset" && !auth.session ? (
          <>
            <p>Vui lòng mở liên kết khôi phục từ email.</p>
            <Link to="/forgot-password">Gửi lại liên kết</Link>
          </>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <Field label="Họ và tên" required>
                <input
                  className="input"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            {mode !== "reset" && (
              <Field label="Email" required>
                <input
                  className="input"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field label="Mật khẩu" required>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={mode === "login" ? undefined : 8}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
            )}
            <Button className="w-full" disabled={busy || auth.loading}>
              {busy ? "Đang xử lý…" : titles[mode]}
            </Button>
          </form>
        )}
        {(mode === "login" || mode === "signup") &&
          (providers.google || providers.facebook) && (
            <div className="space-y-3 border-t border-slate-200 pt-5">
              <p className="text-center text-xs text-slate-500">
                Hoặc tiếp tục bằng
              </p>
              <div className="grid gap-2">
                {providers.google && (
                  <button
                    type="button"
                    disabled={busy || auth.loading}
                    onClick={() => void socialSignIn("google")}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="#4285F4"
                        d="M21.35 12.25c0-.68-.06-1.18-.2-1.7H12v3.3h5.37a4.6 4.6 0 0 1-2 3.02v2.5h3.22c1.89-1.75 2.76-4.32 2.76-7.12Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 21.5c2.7 0 4.97-.89 6.63-2.41l-3.22-2.5c-.9.6-2.04.96-3.41.96a6.13 6.13 0 0 1-5.76-4.25H2.92v2.58A10 10 0 0 0 12 21.5Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M6.24 13.3a6.06 6.06 0 0 1 0-3.6V7.12H2.92a10 10 0 0 0 0 8.76l3.32-2.58Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 6.45c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.52 9.52 0 0 0 12 2.5a10 10 0 0 0-9.08 5.62l3.32 2.58A6.13 6.13 0 0 1 12 6.45Z"
                      />
                    </svg>
                    Tiếp tục với Google
                  </button>
                )}
                {providers.facebook && (
                  <button
                    type="button"
                    disabled={busy || auth.loading}
                    onClick={() => void socialSignIn("facebook")}
                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] font-bold text-white"
                    >
                      f
                    </span>
                    Tiếp tục với Facebook
                  </button>
                )}
              </div>
            </div>
          )}
        <div className="flex flex-wrap gap-4 text-sm text-brand-700">
          <Link to="/login">Đăng nhập</Link>
          <Link to="/signup">Đăng ký</Link>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  );
}
