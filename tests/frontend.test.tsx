import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { AuthProvider, useAuth } from "@/lib/auth";
import { RequireAuth, RequireRole } from "@/components/RequireRole";
import { AuthPage } from "@/pages/AuthPage";
import { getProfile } from "@/lib/api/profiles";
import { findMatches, effectiveStatus } from "@/lib/matching";
import { fetchAll } from "@/lib/api/pagination";
import { validateImage, MAX_IMAGE_BYTES } from "@/lib/api/storage";
import type { FoundReport, LostReport } from "@/types";

const mocks = vi.hoisted(() => ({
  callback: undefined as
    undefined | ((event: string, session: Session | null) => void),
  signIn: vi.fn(),
  signUp: vi.fn(),
  reset: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        mocks.callback = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithPassword: mocks.signIn,
      signUp: mocks.signUp,
      resetPasswordForEmail: mocks.reset,
      updateUser: mocks.update,
    },
  },
}));
vi.mock("@/lib/api/profiles", () => ({ getProfile: vi.fn() }));
const session = (id: string) =>
  ({ user: { id, email: `${id}@example.test` } }) as Session;
function Probe() {
  const auth = useAuth();
  return (
    <p>{auth.loading ? "loading" : (auth.profile?.fullName ?? "signed-out")}</p>
  );
}
function mount(
  child: React.ReactNode,
  path = "/login",
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path]}>
          <AuthProvider>{child}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.signIn.mockResolvedValue({ error: null });
  mocks.signUp.mockResolvedValue({ error: null });
  mocks.reset.mockResolvedValue({ error: null });
  mocks.update.mockResolvedValue({ error: null });
  vi.mocked(getProfile).mockImplementation(async (id) => ({
    id,
    fullName: id,
    role: "member",
    createdAt: "2026-10-12",
  }));
});
describe("auth boundaries", () => {
  it("waits for profile and clears private caches when accounts switch or sign out", async () => {
    const { client } = mount(<Probe />);
    act(() => mocks.callback!("INITIAL_SESSION", null));
    expect(await screen.findByText("signed-out")).toBeTruthy();
    act(() => mocks.callback!("SIGNED_IN", session("first")));
    expect(await screen.findByText("first")).toBeTruthy();
    client.setQueryData(["private-info", "first", "admin", "report"], "secret");
    client.setQueryData(
      ["data", "first", "admin", "claims"],
      ["private claim"],
    );
    act(() => mocks.callback!("SIGNED_IN", session("second")));
    expect(
      client.getQueryData(["private-info", "first", "admin", "report"]),
    ).toBeUndefined();
    expect(screen.queryByText("first")).toBeNull();
    expect(await screen.findByText("second")).toBeTruthy();
    act(() => mocks.callback!("SIGNED_OUT", null));
    expect(await screen.findByText("signed-out")).toBeTruthy();
    expect(client.getQueryData(["profile", "second"])).toBeUndefined();
  });
  it("preserves the requested route and blocks member admin access", async () => {
    mount(
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <RequireRole roles={["admin"]}>
                <p>admin-content</p>
              </RequireRole>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<AuthPage mode="login" />} />
      </Routes>,
      "/admin",
    );
    act(() => mocks.callback!("INITIAL_SESSION", null));
    expect(
      await screen.findByRole("heading", { name: "Đăng nhập" }),
    ).toBeTruthy();
    act(() => mocks.callback!("SIGNED_IN", session("member")));
    expect(await screen.findByText("Không có quyền truy cập.")).toBeTruthy();
    expect(screen.queryByText("admin-content")).toBeNull();
  });
  it("signup requests confirmation and displays the confirmation state", async () => {
    mount(<AuthPage mode="signup" />, "/signup");
    act(() => mocks.callback!("INITIAL_SESSION", null));
    await userEvent.type(screen.getByLabelText(/Họ và tên/), "Bạn");
    await userEvent.type(screen.getByLabelText(/Email/), "test@example.test");
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Đăng ký" }));
    await waitFor(() =>
      expect(mocks.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining("/auth/callback"),
          }),
        }),
      ),
    );
    expect(await screen.findByText(/Kiểm tra hộp thư/)).toBeTruthy();
  });
  it("recovery updates the password only after a recovery session", async () => {
    mount(
      <Routes>
        <Route path="/reset-password" element={<AuthPage mode="reset" />} />
        <Route path="/" element={<Probe />} />
      </Routes>,
      "/reset-password",
    );
    act(() => mocks.callback!("PASSWORD_RECOVERY", session("member")));
    await screen.findByLabelText(/Mật khẩu/);
    await userEvent.type(screen.getByLabelText(/Mật khẩu/), "newpassword123");
    await userEvent.click(
      screen.getByRole("button", { name: "Đặt mật khẩu mới" }),
    );
    await waitFor(() =>
      expect(mocks.update).toHaveBeenCalledWith({ password: "newpassword123" }),
    );
    expect(await screen.findByText("member")).toBeTruthy();
  });
});
describe("matching, pagination and upload validation", () => {
  const base = {
    id: "lost",
    itemName: "AirPods",
    categoryId: "electronics",
    description: "Tai nghe trắng",
    date: "2026-10-12",
    time: "",
    locationId: "alpha",
    building: "Alpha",
    reporterId: "member",
    reporterName: "Bạn",
    createdAt: "2026-10-12",
    updatedAt: "2026-10-12",
    moderationStatus: "VISIBLE" as const,
  };
  const lost: LostReport = {
    ...base,
    kind: "lost",
    status: "LOST",
    floorRoom: "",
    distinguishingCharacteristics: "Scratch",
    contactPreference: "Email",
  };
  const found: FoundReport = {
    ...base,
    id: "found",
    kind: "found",
    status: "AVAILABLE",
    currentHolder: "security-desk",
  };
  it("preserves matching while excluding hidden or terminal reports", () => {
    expect(findMatches(lost, [lost, found])).toHaveLength(1);
    expect(effectiveStatus(lost, [lost, found])).toBe("POSSIBLE_MATCH");
    expect(
      findMatches(lost, [{ ...found, moderationStatus: "HIDDEN" }]),
    ).toHaveLength(0);
    expect(findMatches({ ...lost, status: "CLOSED" }, [found])).toHaveLength(0);
    expect(findMatches(lost, [{ ...found, status: "RETURNED" }])).toHaveLength(
      0,
    );
  });
  it("fetches more than the default server row limit and propagates failures", async () => {
    const all = Array.from({ length: 1203 }, (_, id) => ({ id }));
    const fetch = vi.fn(async (from: number, to: number) => ({
      data: all.slice(from, to + 1),
      error: null,
    }));
    expect(await fetchAll(fetch)).toHaveLength(1203);
    expect(fetch).toHaveBeenCalledTimes(3);
    await expect(
      fetchAll(async () => ({ data: null, error: new Error("network") })),
    ).rejects.toThrow("network");
    const controller = new AbortController();
    controller.abort();
    await expect(fetchAll(fetch, controller.signal)).rejects.toThrow();
  });
  it("rejects unsupported, oversized or empty uploads and accepts the size boundary", () => {
    expect(() => validateImage({ type: "image/svg+xml", size: 100 })).toThrow();
    expect(() =>
      validateImage({ type: "image/jpeg", size: MAX_IMAGE_BYTES + 1 }),
    ).toThrow();
    expect(() => validateImage({ type: "image/png", size: 0 })).toThrow();
    expect(() =>
      validateImage({ type: "image/webp", size: MAX_IMAGE_BYTES }),
    ).not.toThrow();
  });
});
