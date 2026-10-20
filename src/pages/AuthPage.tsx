import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { errorMessage } from "@/lib/errors";
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
    [message, setMessage] = useState("");
  const rawFrom = (location.state as { from?: string } | null)?.from;
  const from =
    rawFrom?.startsWith("/") &&
    !rawFrom.startsWith("//") &&
    !rawFrom.includes("\\")
      ? rawFrom
      : "/";
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
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage(
          "Nếu email có thể đăng ký, bạn sẽ nhận được thư xác nhận. Kiểm tra hộp thư trước khi đăng nhập.",
        );
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        if (error) throw error;
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
          <p role="status" className="text-sm text-green-700">
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
        <div className="flex flex-wrap gap-4 text-sm text-brand-700">
          <Link to="/login">Đăng nhập</Link>
          <Link to="/signup">Đăng ký</Link>
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>
      </div>
    </div>
  );
}
