import { afterEach, it, expect, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("missing and malformed configuration render an error instead of throwing", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "http://");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "x");
  const module = await import("@/lib/supabase");
  expect(module.configurationError).toContain("Chưa cấu hình");
});
it("service-role JWT cannot be used as the browser key", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv(
    "VITE_SUPABASE_ANON_KEY",
    `header.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
  );
  const module = await import("@/lib/supabase");
  expect(module.configurationError).toContain("khóa bí mật");
});
