import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
function validUrl(value?: string) {
  try {
    const parsed = new URL(value ?? "");
    return (
      ["http:", "https:"].includes(parsed.protocol) &&
      !!parsed.hostname &&
      !parsed.hostname.includes("your-project")
    );
  } catch {
    return false;
  }
}
function isSecret(value?: string) {
  if (value?.startsWith("sb_secret_")) return true;
  try {
    return (
      JSON.parse(
        atob(value?.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? ""),
      ).role === "service_role"
    );
  } catch {
    return false;
  }
}
export const configurationError =
  !validUrl(url) || !key
    ? "Chưa cấu hình Supabase. Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local rồi khởi động lại ứng dụng."
    : isSecret(key)
      ? "Không được dùng khóa bí mật trong cấu hình trình duyệt. Hãy dùng publishable key hoặc anon key."
      : null;
// The fallback lets the configuration screen render without throwing during imports.
export const supabase = createClient<Database>(
  configurationError ? "https://unconfigured.invalid" : url!,
  configurationError ? "unconfigured" : key!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
