import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { OnboardingGate } from "@/components/OnboardingGate";

const auth = vi.hoisted(() => ({
  profile: { id: "onboarding-user", fullName: "Bạn", role: "member" },
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
function Destination() {
  const location = useLocation();
  return (
    <p data-testid="destination">
      {location.pathname + location.search + location.hash}
    </p>
  );
}
function mount(path = "/items?q=balo#results") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route
          path="*"
          element={
            <OnboardingGate>
              <Destination />
            </OnboardingGate>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  localStorage.clear();
  auth.profile.id = crypto.randomUUID();
});
describe("onboarding navigation", () => {
  it("guides the first visit, supports back navigation and preserves the intended destination", async () => {
    const user = userEvent.setup();
    mount();
    expect(screen.getByRole("heading").textContent).toContain("Đồ thất lạc.");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    expect(screen.getByRole("heading").textContent).toContain("Một tin đăng.");
    expect(document.activeElement).toBe(screen.getByRole("heading"));
    await user.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByRole("heading").textContent).toContain("Đồ thất lạc.");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Bắt đầu sử dụng" }));
    expect(screen.getByTestId("destination").textContent).toBe(
      "/items?q=balo#results",
    );
    expect(localStorage.getItem(`fpt:onboarding:v1:${auth.profile.id}`)).toBe(
      "done",
    );
  });
  it("skips once per account and lets a different account see its own guide", async () => {
    const user = userEvent.setup();
    const first = mount();
    await user.click(screen.getByRole("button", { name: "Bỏ qua hướng dẫn" }));
    first.unmount();
    const returning = mount();
    expect(screen.queryByRole("heading")).toBeNull();
    returning.unmount();
    auth.profile.id = crypto.randomUUID();
    mount();
    expect(screen.getByRole("heading").textContent).toContain("Đồ thất lạc.");
  });
  it("allows replay and a direct found-report action", async () => {
    localStorage.setItem(`fpt:onboarding:v1:${auth.profile.id}`, "done");
    const user = userEvent.setup();
    mount("/onboarding?next=%2Faccount");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tôi nhặt được đồ" }));
    expect(screen.getByTestId("destination").textContent).toBe("/report-found");
  });
  it("continues even when the browser refuses local storage", async () => {
    const get = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    const set = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    try {
      mount();
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Bỏ qua hướng dẫn" }));
      expect(screen.getByTestId("destination").textContent).toBe(
        "/items?q=balo#results",
      );
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });
  it.each([
    "https://example.com",
    "//example.com",
    "/\\example.com",
    "/onboarding",
    "/login",
  ])("rejects an invalid return destination: %s", async (next) => {
    mount(`/onboarding?next=${encodeURIComponent(next)}`);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Bỏ qua hướng dẫn" }));
    expect(screen.getByTestId("destination").textContent).toBe("/");
  });
});
