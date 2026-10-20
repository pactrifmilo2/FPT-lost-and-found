import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createDatabase,
  seedUsers,
  asUser,
  users,
  reportData,
} from "./helpers/database.mjs";

let db;
before(async () => {
  db = await createDatabase();
  await seedUsers(db);
});
after(async () => {
  await db?.close();
});
const act = (user, sql, args) => asUser(db, users[user], sql, args);
async function makeReport(user = "member", kind = "found", extra = {}) {
  return (
    await act(user, `select * from public.create_report($1,$2,$3)`, [
      randomUUID(),
      JSON.stringify({ ...reportData(kind), ...extra }),
      kind === "found" ? "Secret serial number" : null,
    ])
  ).rows[0];
}
async function makeClaim(user, found, lost) {
  return (
    await act(user, `select * from public.submit_claim($1)`, [
      JSON.stringify({
        found_item_id: found.id,
        lost_item_id: lost?.id,
        explanation: "Đây là đồ của tôi",
        distinguishing_characteristics: "Vết xước",
        contact_info: "member@example.test",
      }),
    ])
  ).rows[0];
}
async function transition(claim, action) {
  return (
    await act("admin", `select * from public.transition_claim($1,$2,$3,$4)`, [
      claim.id,
      action,
      claim.updated_at,
      null,
    ])
  ).rows[0];
}
test("signup ignores forged role; profiles and references are isolated", async () => {
  const rows = (await act("member", "select * from profiles")).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, "member");
  await assert.rejects(
    act("member", `update profiles set role='admin' where id=$1`, [
      users.member,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    act("member", `select set_user_role($1,'admin')`, [users.member]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    act("admin", `select set_user_role($1,'member')`, [users.admin]),
    /LAST_ADMIN/,
  );
  assert.equal(
    (await act("member", "select * from categories")).rows.length,
    10,
  );
  await assert.rejects(
    act("member", `insert into categories values('bad','bad','x','#000000')`),
    /row-level security/,
  );
  await assert.rejects(
    act("unverified", `select update_profile_name('new')`),
    /AUTH_REQUIRED/,
  );
});
test("report/private creation is atomic; protected fields and privacy enforced", async () => {
  const count = (await db.query("select count(*) from reports")).rows[0].count;
  await assert.rejects(
    act("member", `select create_report($1,$2,null)`, [
      randomUUID(),
      JSON.stringify(reportData()),
    ]),
    /null value/,
  );
  assert.equal(
    (await db.query("select count(*) from reports")).rows[0].count,
    count,
  );
  const r = await makeReport();
  assert.equal(r.moderation_status, "VISIBLE");
  assert.equal(r.reporter_id, users.member);
  assert.equal(
    (await act("member", "select * from report_private")).rows.length,
    0,
  );
  assert.ok(
    (await act("admin", "select * from report_private")).rows.length > 0,
  );
  await assert.rejects(
    act("member", `update reports set status='RETURNED' where id=$1`, [r.id]),
    /permission denied/,
  );
  await assert.rejects(
    act("member", `select edit_report($1,$2,$3,null)`, [
      r.id,
      '{"moderation_status":"VISIBLE"}',
      r.updated_at,
    ]),
    /PROTECTED_FIELD/,
  );
  await assert.rejects(
    act("second", `select edit_report($1,$2,$3,null)`, [
      r.id,
      '{"description":"forged"}',
      r.updated_at,
    ]),
    /FORBIDDEN/,
  );
});
test("moderation hides posts from others, edits cannot restore; stale writes fail", async () => {
  let r = await makeReport();
  await assert.rejects(
    act("member", `select moderate_report($1,'hide','reason',$2)`, [
      r.id,
      r.updated_at,
    ]),
    /FORBIDDEN/,
  );
  await assert.rejects(
    act("admin", `select moderate_report($1,'hide','',$2)`, [
      r.id,
      r.updated_at,
    ]),
    /REASON_REQUIRED/,
  );
  r = (
    await act(
      "admin",
      `select * from moderate_report($1,'hide','Thông tin không phù hợp',$2)`,
      [r.id, r.updated_at],
    )
  ).rows[0];
  assert.equal(
    (await act("second", "select * from reports where id=$1", [r.id])).rows
      .length,
    0,
  );
  assert.equal(
    (await act("member", "select * from reports where id=$1", [r.id])).rows
      .length,
    1,
  );
  const edited = (
    await act("member", `select * from edit_report($1,$2,$3,null)`, [
      r.id,
      '{"description":"Đã sửa"}',
      r.updated_at,
    ])
  ).rows[0];
  assert.equal(edited.moderation_status, "HIDDEN");
  await assert.rejects(
    act("member", `select edit_report($1,$2,$3,null)`, [
      r.id,
      "{}",
      r.updated_at,
    ]),
    /STALE_RECORD/,
  );
  await assert.rejects(makeClaim("second", r), /REPORT_UNAVAILABLE/);
});
test("claim validates kind, ownership, status, duplicates, and private membership", async () => {
  const found = await makeReport();
  const lost = await makeReport("member", "lost");
  await assert.rejects(makeClaim("second", found, lost), /INVALID_LOST_REPORT/);
  await assert.rejects(makeClaim("member", lost), /REPORT_UNAVAILABLE/);
  await assert.rejects(
    act("member", `select submit_claim($1)`, [
      JSON.stringify({ found_item_id: found.id, status: "APPROVED" }),
    ]),
    /PROTECTED_FIELD/,
  );
  const c = await makeClaim("member", found, lost);
  assert.equal(c.status, "PENDING");
  await assert.rejects(makeClaim("member", found, lost), /duplicate key/);
  assert.equal(
    (await act("second", "select * from claims where id=$1", [c.id])).rows
      .length,
    0,
  );
  await assert.rejects(
    act("member", `select transition_claim($1,'approve',$2,null)`, [
      c.id,
      c.updated_at,
    ]),
    /FORBIDDEN/,
  );
  const statuses = (
    await db.query("select status from reports where id in ($1,$2)", [
      found.id,
      lost.id,
    ])
  ).rows;
  assert.ok(statuses.every((r) => r.status === "CLAIM_IN_PROGRESS"));
});
test("winner constraints, immutable review evidence, completion and conflict restoration", async () => {
  const found = await makeReport();
  const lost = await makeReport("member", "lost");
  const otherLost = await makeReport("second", "lost");
  let a = await makeClaim("member", found, lost),
    b = await makeClaim("second", found, otherLost);
  await assert.rejects(transition(a, "complete"), /INVALID_TRANSITION/);
  a = await transition(a, "review");
  b = await transition(b, "review");
  const fresh = (
    await db.query("select * from reports where id=$1", [found.id])
  ).rows[0];
  await assert.rejects(
    act("member", `select edit_report($1,'{}',$2,null)`, [
      found.id,
      fresh.updated_at,
    ]),
    /REPORT_LOCKED/,
  );
  a = await transition(a, "approve");
  await assert.rejects(transition(b, "approve"), /duplicate key/);
  a = await transition(a, "complete");
  assert.equal(a.status, "COMPLETED");
  assert.equal(
    (await db.query("select status from claims where id=$1", [b.id])).rows[0]
      .status,
    "REJECTED",
  );
  assert.equal(
    (await db.query("select status from reports where id=$1", [otherLost.id]))
      .rows[0].status,
    "LOST",
  );
  assert.ok(
    (
      await db.query("select status from reports where id in ($1,$2)", [
        found.id,
        lost.id,
      ])
    ).rows.every((r) => r.status === "RETURNED"),
  );
  await assert.rejects(transition(a, "reopen"), /INVALID_TRANSITION/);
  await assert.rejects(
    act("admin", "select delete_report($1)", [found.id]),
    /foreign key/,
  );
});
test("rejection recomputes status; reopening remains eligible and stale review is rejected", async () => {
  const found = await makeReport();
  let c = await makeClaim("member", found);
  const old = c;
  c = await transition(c, "reject");
  assert.equal(
    (await db.query("select status from reports where id=$1", [found.id]))
      .rows[0].status,
    "AVAILABLE",
  );
  await assert.rejects(transition(old, "review"), /STALE_RECORD/);
  c = await transition(c, "reopen");
  assert.equal(c.status, "UNDER_REVIEW");
  assert.equal(
    (await db.query("select status from reports where id=$1", [found.id]))
      .rows[0].status,
    "CLAIM_IN_PROGRESS",
  );
});
test("storage ownership, immutable paths, hidden reads and referenced image deletion", async () => {
  const id = randomUUID(),
    path = `${users.member}/${id}/${randomUUID()}.jpg`;
  await act(
    "member",
    `insert into storage.objects(bucket_id,name) values('item-images',$1)`,
    [path],
  );
  await assert.rejects(
    act(
      "second",
      `insert into storage.objects(bucket_id,name) values('item-images',$1)`,
      [`${users.member}/${randomUUID()}/${randomUUID()}.jpg`],
    ),
    /row-level security/,
  );
  await assert.rejects(
    act(
      "member",
      `insert into storage.objects(bucket_id,name) values('item-images',$1)`,
      [`${users.member}/${randomUUID()}/${randomUUID()}.svg`],
    ),
    /row-level security/,
  );
  let r = (
    await act("member", `select * from create_report($1,$2,$3)`, [
      id,
      JSON.stringify({ ...reportData(), image_path: path }),
      "secret",
    ])
  ).rows[0];
  await act("member", `delete from storage.objects where name=$1`, [path]);
  assert.equal(
    (await db.query("select * from storage.objects where name=$1", [path])).rows
      .length,
    1,
  );
  await act(
    "member",
    `update storage.objects set name='changed' where name=$1`,
    [path],
  );
  assert.equal(
    (await db.query("select * from storage.objects where name=$1", [path])).rows
      .length,
    1,
  );
  await act("admin", `select moderate_report($1,'hide','reason',$2)`, [
    r.id,
    r.updated_at,
  ]);
  assert.equal(
    (await act("second", "select * from storage.objects where name=$1", [path]))
      .rows.length,
    0,
  );
  await assert.rejects(
    makeReport("second", "found", { image_path: path }),
    /INVALID_IMAGE/,
  );
  await act("admin", "select delete_report($1)", [r.id]);
  await act("member", "delete from storage.objects where name=$1", [path]);
  assert.equal(
    (await db.query("select * from storage.objects where name=$1", [path])).rows
      .length,
    0,
  );
});
test("anonymous access and internal helper execution are denied", async () => {
  await db.exec("begin; set local role anon");
  try {
    await assert.rejects(
      db.query("select * from reports"),
      /permission denied/,
    );
  } finally {
    await db.exec("rollback");
  }
  await assert.rejects(
    act("member", "select private.sync_report_statuses()"),
    /permission denied/,
  );
  await assert.rejects(
    act("admin", `delete from categories where id='electronics'`),
    /foreign key/,
  );
});
test("hidden reports preserve claimant tracking but are excluded from new claims", async () => {
  const found = await makeReport();
  const claim = await makeClaim("second", found);
  const fresh = (
    await db.query("select * from reports where id=$1", [found.id])
  ).rows[0];
  await act("admin", `select moderate_report($1,'hide','reason',$2)`, [
    found.id,
    fresh.updated_at,
  ]);
  assert.equal(
    (await act("second", "select * from reports where id=$1", [found.id])).rows
      .length,
    1,
  );
  assert.equal(
    (
      await act("second", "select * from report_private where report_id=$1", [
        found.id,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (await act("second", "select * from claims where id=$1", [claim.id])).rows
      .length,
    1,
  );
  await assert.rejects(makeClaim("member", found), /REPORT_UNAVAILABLE/);
});
test("one linked lost report cannot win two found items; private edit failure rolls back public edits", async () => {
  const f1 = await makeReport(),
    f2 = await makeReport(),
    lost = await makeReport("member", "lost");
  let c1 = await makeClaim("member", f1, lost),
    c2 = await makeClaim("member", f2, lost);
  c1 = await transition(c1, "review");
  c2 = await transition(c2, "review");
  c1 = await transition(c1, "approve");
  await assert.rejects(transition(c2, "approve"), /duplicate key/);
  c1 = await transition(c1, "complete");
  assert.equal(
    (await db.query("select status from claims where id=$1", [c2.id])).rows[0]
      .status,
    "REJECTED",
  );
  assert.equal(
    (await db.query("select status from reports where id=$1", [f2.id])).rows[0]
      .status,
    "AVAILABLE",
  );
  const editable = await makeReport();
  await assert.rejects(
    act("member", `select edit_report($1,$2,$3,$4)`, [
      editable.id,
      '{"description":"Should roll back"}',
      editable.updated_at,
      "",
    ]),
    /check constraint/,
  );
  assert.equal(
    (
      await db.query("select description from reports where id=$1", [
        editable.id,
      ])
    ).rows[0].description,
    editable.description,
  );
});
test("closing/reopening recomputes pending statuses and prevents returned-item reopening", async () => {
  const found = await makeReport();
  await makeClaim("member", found);
  let fresh = (await db.query("select * from reports where id=$1", [found.id]))
    .rows[0];
  fresh = (
    await act("admin", `select * from moderate_report($1,'close','',$2)`, [
      fresh.id,
      fresh.updated_at,
    ])
  ).rows[0];
  assert.equal(fresh.status, "CLOSED");
  await assert.rejects(makeClaim("second", fresh), /REPORT_UNAVAILABLE/);
  fresh = (
    await act("admin", `select * from moderate_report($1,'reopen','',$2)`, [
      fresh.id,
      fresh.updated_at,
    ])
  ).rows[0];
  assert.equal(fresh.status, "CLAIM_IN_PROGRESS");
  const returned = (
    await db.query("select * from reports where status='RETURNED' limit 1")
  ).rows[0];
  await assert.rejects(
    act("admin", `select moderate_report($1,'reopen','',$2)`, [
      returned.id,
      returned.updated_at,
    ]),
    /REPORT_LOCKED/,
  );
});
