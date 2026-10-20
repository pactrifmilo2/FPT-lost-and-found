import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import pg from "pg";
// Preserve microseconds: JS Date truncation would invalidate optimistic version tokens.
pg.types.setTypeParser(1184, (value) => value);
import {
  applySchema,
  seedUsers,
  asUser,
  users,
  reportData,
} from "./helpers/database.mjs";
let bin = process.env.PG_BIN;
if (!bin)
  try {
    bin = dirname(
      execFileSync(
        process.platform === "win32" ? "where.exe" : "which",
        ["psql"],
        { encoding: "utf8", windowsHide: true },
      )
        .trim()
        .split(/\r?\n/)[0],
    );
  } catch {
    /* Optional native server for real multi-connection testing. */
  }
const exe = (name) =>
  join(bin ?? "", name + (process.platform === "win32" ? ".exe" : ""));
test(
  "simultaneous claim approvals permit exactly one winner (native PostgreSQL)",
  { skip: !bin || !existsSync(exe("initdb")), timeout: 90_000 },
  async () => {
    const directory = mkdtempSync(join(tmpdir(), "fpt-lost-found-test-"));
    const run = (name, args) => {
      const result = spawnSync(exe(name), args, {
        windowsHide: true,
        stdio: "ignore",
        timeout: 30_000,
      });
      if (result.error || result.status !== 0)
        throw new Error(
          `PostgreSQL ${name} failed: ${result.error?.message ?? result.status}. ${existsSync(join(directory, "server.log")) ? readFileSync(join(directory, "server.log"), "utf8") : ""}`,
        );
    };
    const socket = createServer();
    await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
    const port = socket.address().port;
    await new Promise((resolve) => socket.close(resolve));
    let started = false;
    const clients = [];
    try {
      run("initdb", [
        "-D",
        directory,
        "-U",
        "postgres",
        "-A",
        "trust",
        "--no-locale",
        "-E",
        "UTF8",
      ]);
      started = true;
      run("pg_ctl", [
        "-D",
        directory,
        "-l",
        join(directory, "server.log"),
        "-o",
        `-F -h 127.0.0.1 -p ${port}`,
        "-w",
        "start",
      ]);
      const create = async () => {
        const client = new pg.Client({
          host: "127.0.0.1",
          port,
          user: "postgres",
          database: "postgres",
        });
        await client.connect();
        clients.push(client);
        return client;
      };
      const owner = await create(),
        a = await create(),
        b = await create();
      const wrap = (client) => ({
        exec: (sql) => client.query(sql),
        query: (sql, args) => client.query(sql, args),
      });
      const db = wrap(owner);
      await applySchema(db);
      await seedUsers(db);
      const report = (
        await asUser(
          db,
          users.member,
          "select * from create_report($1,$2,$3)",
          [randomUUID(), JSON.stringify(reportData()), "secret"],
        )
      ).rows[0];
      const claims = [];
      for (const id of [users.member, users.second]) {
        let claim = (
          await asUser(db, id, "select * from submit_claim($1)", [
            JSON.stringify({
              found_item_id: report.id,
              explanation: "Mine",
              distinguishing_characteristics: "Scratch",
              contact_info: "test",
            }),
          ])
        ).rows[0];
        claim = (
          await asUser(
            db,
            users.admin,
            "select * from transition_claim($1,$2,$3,null)",
            [claim.id, "review", claim.updated_at],
          )
        ).rows[0];
        claims.push(claim);
      }
      const result = await Promise.allSettled(
        [a, b].map((client, i) =>
          asUser(
            wrap(client),
            users.admin,
            "select * from transition_claim($1,$2,$3,null)",
            [claims[i].id, "approve", claims[i].updated_at],
          ),
        ),
      );
      assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        result.find((r) => r.status === "rejected").reason.code,
        "23505",
      );
      assert.equal(
        (
          await owner.query(
            "select count(*)::int as n from claims where status='APPROVED'",
          )
        ).rows[0].n,
        1,
      );
    } finally {
      await Promise.all(clients.map((client) => client.end()));
      if (started && existsSync(join(directory, "postmaster.pid")))
        run("pg_ctl", ["-D", directory, "-m", "immediate", "-w", "stop"]);
      const target = resolve(directory),
        root = resolve(tmpdir());
      if (
        dirname(target) !== root ||
        !basename(target).startsWith("fpt-lost-found-test-")
      )
        throw new Error("Unsafe temporary cleanup path");
      rmSync(target, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 200,
      });
    }
  },
);
