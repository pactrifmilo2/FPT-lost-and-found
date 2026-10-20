import { test, expect, type Page } from "@playwright/test";
const memberId = "00000000-0000-4000-8000-000000000001";
const secondId = "00000000-0000-4000-8000-000000000002";
const adminId = "00000000-0000-4000-8000-000000000003";
const base = {
  id: "10000000-0000-4000-8000-000000000001",
  kind: "found",
  item_name: "Tai nghe thử nghiệm",
  category_id: "electronics",
  description: "Tai nghe trắng",
  date: "2026-10-12",
  time: "10:30:00",
  location_id: "alpha",
  building: "Toà Alpha",
  floor_room: "",
  image_path: null,
  reporter_id: memberId,
  reporter_name: "Thành viên",
  created_at: "2026-10-12T00:00:00Z",
  updated_at: "2026-10-12T00:00:00.123456Z",
  status: "AVAILABLE",
  distinguishing_characteristics: "",
  contact_preference: "",
  current_holder: "security-desk",
  moderation_status: "VISIBLE",
  moderation_reason: null,
  moderated_at: null,
  moderated_by: null,
};
async function backend(
  page: Page,
  {
    role = "member",
    failSave = false,
  }: { role?: "member" | "admin"; failSave?: boolean } = {},
) {
  const state = {
    reports: [
      { ...base },
      {
        ...base,
        id: "10000000-0000-4000-8000-000000000002",
        item_name: "Tin bị ẩn",
        moderation_status: "HIDDEN",
        moderation_reason: "Nội dung không phù hợp",
        moderated_by: adminId,
      },
    ],
    privateReads: 0,
    removed: 0,
    signs: 0,
  };
  const id = role === "admin" ? adminId : memberId;
  const user = {
    id,
    aud: "authenticated",
    role: "authenticated",
    email: role + "@example.test",
    email_confirmed_at: "2026-10-12T00:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: role === "admin" ? "Quản trị" : "Thành viên" },
    created_at: "2026-10-12T00:00:00Z",
  };
  const payload = {
    sub: id,
    aud: "authenticated",
    role: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const token =
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url") +
    "." +
    Buffer.from(JSON.stringify(payload)).toString("base64url") +
    ".test";
  await page.route("http://127.0.0.1:54399/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
    };
    const json = (data: unknown, status = 200) =>
      route.fulfill({
        status,
        headers,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    if (request.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });
    if (path === "/auth/v1/token")
      return json({
        access_token: token,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "test-refresh",
        user,
      });
    if (path === "/auth/v1/user") return json(user);
    if (path === "/auth/v1/logout") return json({});
    if (path === "/rest/v1/profiles") {
      const profile = {
        id,
        full_name: user.user_metadata.full_name,
        role,
        created_at: user.created_at,
      };
      return json(
        url.searchParams.get("id")
          ? profile
          : [
              profile,
              {
                id: secondId,
                full_name: "Thành viên thứ hai",
                role: "member",
                created_at: user.created_at,
              },
            ],
      );
    }
    if (path === "/rest/v1/categories")
      return json([
        {
          id: "electronics",
          name: "Đồ điện tử",
          emoji: "🎧",
          color: "#6366f1",
        },
      ]);
    if (path === "/rest/v1/locations")
      return json([{ id: "alpha", name: "Toà Alpha", kind: "building" }]);
    if (path === "/rest/v1/reports") return json(state.reports);
    if (path === "/rest/v1/claims") return json([]);
    if (path === "/rest/v1/report_private") {
      state.privateReads++;
      return json({
        private_verification_info: "Bí mật chỉ dành cho quản trị",
      });
    }
    if (path === "/rest/v1/rpc/create_report") {
      if (failSave)
        return json({ code: "P0001", message: "INVALID_IMAGE" }, 400);
      const args = request.postDataJSON();
      state.reports.push({ ...base, ...args.p_data, id: args.p_id });
      return json(state.reports.at(-1));
    }
    if (path === "/rest/v1/rpc/edit_report") {
      const args = request.postDataJSON();
      const report = state.reports.find((r) => r.id === args.p_id)!;
      Object.assign(report, args.p_data);
      return json(report);
    }
    if (path === "/rest/v1/rpc/moderate_report") {
      const args = request.postDataJSON();
      const report = state.reports.find((r) => r.id === args.p_id)!;
      report.moderation_status =
        args.p_action === "hide" ? "HIDDEN" : "VISIBLE";
      report.moderation_reason = args.p_reason;
      return json(report);
    }
    if (
      path.startsWith("/storage/v1/object/sign/") &&
      request.method() === "POST"
    ) {
      state.signs++;
      return json({
        signedURL:
          "/object/sign/item-images/test.jpg?token=test&v=" + state.signs,
      });
    }
    if (
      path.startsWith("/storage/v1/object/sign/") &&
      request.method() === "GET"
    )
      return route.fulfill({
        headers,
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    if (path.startsWith("/storage/v1/object/") && request.method() === "POST")
      return json({ Key: path.split("/object/")[1], Id: "test-image" });
    if (
      path.startsWith("/storage/v1/object/") &&
      request.method() === "DELETE"
    ) {
      state.removed++;
      return json([]);
    }
    return json({ code: "TEST_UNEXPECTED_REQUEST", message: path }, 500);
  });
  return state;
}
async function login(page: Page) {
  await page.goto("/items");
  await page.getByLabel("Email").fill("member@example.test");
  await page.getByLabel("Mật khẩu").fill("password123");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/items$/);
  await expect(
    page.getByRole("heading", { name: "Đồ thất lạc", exact: true }),
  ).toBeVisible();
}
async function fillFound(page: Page) {
  await page.goto("/report-found");
  await page.locator("#itemName").fill("Bình nước mới");
  await page.locator("#category").selectOption("electronics");
  await page.locator("#description").fill("Bình nước màu xanh");
  await page.locator("#location").selectOption("alpha");
  await page.locator("#privateInfo").fill("Vết xước ở đáy");
}
test("member feed excludes hidden posts and private evidence, supports edits and logout", async ({
  page,
}) => {
  const state = await backend(page);
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await login(page);
  await expect(
    page.getByText("Tai nghe thử nghiệm", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Tin bị ẩn", { exact: true })).toHaveCount(0);
  await page.getByText("Tai nghe thử nghiệm", { exact: true }).click();
  await expect(page.getByText("Bí mật chỉ dành cho quản trị")).toHaveCount(0);
  expect(state.privateReads).toBe(0);
  await page.getByRole("link", { name: "Chỉnh sửa tin" }).click();
  await page.locator("#description").fill("Đã sửa mô tả");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await expect(page.getByText("Đã sửa mô tả", { exact: true })).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText("Không có quyền truy cập.")).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByRole("heading", { name: "Đăng nhập" })).toBeVisible();
  expect(failures).toEqual([]);
});
test("new post publishes immediately and remains available after refresh", async ({
  page,
}) => {
  await backend(page);
  await login(page);
  await fillFound(page);
  await page
    .getByRole("button", {
      name: /Đăng tin nhặt|Gửi tin nhặt|Báo nhặt|Đăng tin/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Bình nước mới" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Bình nước mới" }),
  ).toBeVisible();
  await page.goto("/items");
  await expect(page.getByText("Bình nước mới", { exact: true })).toBeVisible();
});
test("admin reads verification evidence and hides/restores posts", async ({
  page,
}) => {
  const state = await backend(page, { role: "admin" });
  await login(page);
  await page.getByText("Tai nghe thử nghiệm", { exact: true }).click();
  await expect(page.getByText("Bí mật chỉ dành cho quản trị")).toBeVisible();
  expect(state.privateReads).toBeGreaterThan(0);
  await page.goto("/admin");
  await page.getByRole("button", { name: "Tin đăng", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept("Thông tin sai"));
  const row = page.getByRole("row").filter({ hasText: "Tai nghe thử nghiệm" });
  await row.getByRole("button", { name: "Ẩn tin", exact: true }).click();
  await expect(row.getByText("Đã ẩn: Thông tin sai")).toBeVisible();
  await row.getByRole("button", { name: "Hiện tin" }).click();
  await expect(row.getByText("Đang hiển thị", { exact: true })).toBeVisible();
});
test("failed report save preserves the form, displays error and cleans uploaded image", async ({
  page,
}) => {
  const state = await backend(page, { failSave: true });
  await login(page);
  await fillFound(page);
  await page.locator("input[type=file]").setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", {
      name: /Đăng tin nhặt|Gửi tin nhặt|Báo nhặt|Đăng tin/,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ảnh không hợp lệ");
  await expect(page.locator("#itemName")).toHaveValue("Bình nước mới");
  expect(state.removed).toBe(1);
});
test("mobile navigation renders without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await backend(page);
  await login(page);
  await page.getByRole("button", { name: "Mở / đóng menu" }).click();
  await expect(
    page.getByRole("link", { name: "Báo mất đồ", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const width of [768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("signed images refresh before expiry and can be removed after saving", async ({
  page,
}) => {
  await page.clock.install();
  const state = await backend(page);
  await login(page);
  await fillFound(page);
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2WQAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await page.getByRole("button", { name: "Gửi tin nhặt được" }).click();
  const image = page.getByRole("img", { name: "Bình nước mới" });
  await expect(image).toBeVisible();
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth))
    .toBeGreaterThan(0);
  const before = state.signs;
  await page.clock.fastForward(241_000);
  await expect.poll(() => state.signs).toBeGreaterThan(before);
  await page.getByTitle("Đổi ảnh").click();
  await page.getByRole("button", { name: "Xóa ảnh" }).click();
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("img", { name: "Bình nước mới" })).toHaveCount(0);
  expect(state.removed).toBe(1);
});
