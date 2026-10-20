import { createClient } from "@supabase/supabase-js";

const {
  SUPABASE_URL: url,
  SUPABASE_SERVICE_ROLE_KEY: key,
  DEMO_PASSWORD: password,
} = process.env;
if (
  process.env.ALLOW_DEMO_SEED !== "true" ||
  !url ||
  !key ||
  !password ||
  password.length < 8
) {
  throw new Error(
    "Configure .env.demo.local with a DEVELOPMENT project, an 8+ character password, and ALLOW_DEMO_SEED=true.",
  );
}
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, key, options);
const definitions = [
  {
    email: process.env.DEMO_ADMIN_EMAIL,
    name: "Quản trị viên demo",
    role: "admin",
  },
  {
    email: process.env.DEMO_MEMBER_EMAIL,
    name: "Thành viên demo",
    role: "member",
  },
  {
    email: process.env.DEMO_SECOND_MEMBER_EMAIL,
    name: "Thành viên thứ hai",
    role: "member",
  },
];
if (
  definitions.some((d) => !d.email) ||
  new Set(definitions.map((d) => d.email)).size !== 3
)
  throw new Error("Configure three distinct demo emails.");
async function checked(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
const existing = [];
for (let page = 1; ; page++) {
  const data = await checked(
    service.auth.admin.listUsers({ page, perPage: 1000 }),
  );
  existing.push(...data.users);
  if (data.users.length < 1000) break;
}
const members = [];
for (const def of definitions) {
  let user = existing.find(
    (u) => u.email?.toLowerCase() === def.email.toLowerCase(),
  );
  if (!user)
    user = (
      await checked(
        service.auth.admin.createUser({
          email: def.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: def.name },
        }),
      )
    ).user;
  else
    user = (
      await checked(
        service.auth.admin.updateUserById(user.id, {
          password,
          email_confirm: true,
        }),
      )
    ).user;
  await checked(
    service
      .from("profiles")
      .update({ full_name: def.name, role: def.role })
      .eq("id", user.id)
      .select()
      .single(),
  );
  const client = createClient(url, key, options);
  await checked(client.auth.signInWithPassword({ email: def.email, password }));
  members.push({ user, client });
}
// Stable UUIDs: rerunning seeds adds missing fixtures without deleting real records or history.
const ids = {
  found: "10000000-0000-4000-8000-000000000001",
  lost: "10000000-0000-4000-8000-000000000002",
  second: "10000000-0000-4000-8000-000000000003",
};
const base = {
  item_name: "Tai nghe AirPods màu trắng",
  category_id: "electronics",
  description: "Tai nghe trong hộp màu trắng, tìm thấy tại Toà Alpha.",
  date: "2026-10-12",
  time: "10:30",
  location_id: "alpha",
  building: "Toà Alpha",
  floor_room: "",
  image_path: null,
};
for (const [id, who, kind] of [
  [ids.found, 1, "found"],
  [ids.lost, 1, "lost"],
  [ids.second, 2, "lost"],
]) {
  const { data, error } = await service
    .from("reports")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (data) continue;
  await checked(
    members[who].client.rpc("create_report", {
      p_id: id,
      p_data: {
        ...base,
        kind,
        ...(kind === "found"
          ? { current_holder: "security-desk" }
          : {
              distinguishing_characteristics: "Vết xước nhỏ ở đáy hộp",
              contact_preference: "Email",
            }),
      },
      ...(kind === "found"
        ? {
            p_private_info:
              "Thông tin xác minh demo, không phải dữ liệu cá nhân thật.",
          }
        : {}),
    }),
  );
}
for (const [who, lost] of [
  [1, ids.lost],
  [2, ids.second],
]) {
  const { data, error } = await service
    .from("claims")
    .select("id")
    .eq("found_item_id", ids.found)
    .eq("claimant_id", members[who].user.id)
    .limit(1);
  if (error) throw error;
  if (data.length) continue;
  await checked(
    members[who].client.rpc("submit_claim", {
      p_data: {
        found_item_id: ids.found,
        lost_item_id: lost,
        explanation: "Tai nghe này có thể là của tôi.",
        distinguishing_characteristics: "Vết xước nhỏ ở đáy hộp",
        contact_info: definitions[who].email,
      },
    }),
  );
}
for (const { client } of members) await client.auth.signOut();
console.log(
  "Development fixtures ready: one admin, two members, three reports and two competing claims. Credentials are in your ignored local configuration.",
);
