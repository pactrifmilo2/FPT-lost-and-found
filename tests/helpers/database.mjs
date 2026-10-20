import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

// Minimal Supabase-owned schemas. Tests exercise real PostgreSQL RLS, privileges,
// triggers, constraints and functions; the hosted Auth/Storage HTTP services are not mocked here.
export const bootstrap = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key, email text unique, raw_user_meta_data jsonb default '{}', email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid;
$$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated, service_role;
grant select,insert,update,delete on storage.objects to authenticated;
grant all on storage.objects,storage.buckets to service_role;
`;
export async function applySchema(db) {
  await db.exec(bootstrap);
  for (const name of (
    await readdir(new URL("../../supabase/migrations/", import.meta.url))
  ).sort()) {
    if (name.endsWith(".sql"))
      await db.exec(
        await readFile(
          new URL(`../../supabase/migrations/${name}`, import.meta.url),
          "utf8",
        ),
      );
  }
  await db.exec(
    await readFile(new URL("../../supabase/seed.sql", import.meta.url), "utf8"),
  );
}
export async function createDatabase() {
  const db = new PGlite();
  await applySchema(db);
  return db;
}
export const users = {
  member: "00000000-0000-4000-8000-000000000001",
  second: "00000000-0000-4000-8000-000000000002",
  admin: "00000000-0000-4000-8000-000000000003",
  unverified: "00000000-0000-4000-8000-000000000004",
};
export async function seedUsers(db) {
  for (const [name, id] of Object.entries(users)) {
    await db.query(
      `insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values($1,$2,$3,$4)`,
      [
        id,
        `${name}@example.test`,
        JSON.stringify({ full_name: name, role: "admin" }),
        name === "unverified" ? null : new Date(),
      ],
    );
  }
  await db.query(`update public.profiles set role='admin' where id=$1`, [
    users.admin,
  ]);
}
export async function asUser(db, id, sql, args = []) {
  await db.exec("begin; set local role authenticated");
  try {
    await db.query(`select set_config('request.jwt.claim.sub',$1,true)`, [id]);
    const result = await db.query(sql, args);
    await db.exec("commit");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}
export function reportData(kind = "found") {
  return {
    kind,
    item_name: "Tai nghe",
    category_id: "electronics",
    description: "Tai nghe màu trắng",
    date: "2026-10-12",
    time: null,
    location_id: "alpha",
    building: "Toà Alpha",
    floor_room: "",
    image_path: null,
    ...(kind === "found"
      ? { current_holder: "security-desk" }
      : {
          distinguishing_characteristics: "Vết xước",
          contact_preference: "Email",
        }),
  };
}
