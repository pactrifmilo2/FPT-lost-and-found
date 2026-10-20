import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useData, useAction } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useReference } from "@/lib/useReference";
import { useEnrichedItems } from "@/lib/useItems";
import { findMatches } from "@/lib/matching";
import { CLAIM_STATUS_META } from "@/lib/meta";
import { classNames } from "@/lib/utils";
import { ADMIN as T } from "@/lib/i18n";
import { moderateReport, deleteReport } from "@/lib/api/reports";
import { cleanupImage } from "@/lib/api/storage";
import {
  saveCategory,
  deleteCategory,
  saveLocation,
  deleteLocation,
} from "@/lib/api/reference";
import { getProfiles, setRole } from "@/lib/api/profiles";
import type { Report } from "@/types";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";
const tabs = [
  ["overview", "Tổng quan"],
  ["reports", "Tin đăng"],
  ["categories", "Danh mục"],
  ["locations", "Địa điểm"],
  ["users", "Tài khoản"],
] as const;
export function AdminPage() {
  const [tab, setTab] = useState("overview");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{T.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý tin đăng, yêu cầu nhận đồ và dữ liệu trường.
        </p>
      </header>
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={classNames(
              "rounded-lg px-3 py-2 text-sm",
              tab === id
                ? "bg-white font-semibold text-brand-700"
                : "text-slate-600",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview />}
      {tab === "reports" && <ReportsTable />}
      {tab === "categories" && (
        <ReferenceManager key="categories" kind="categories" />
      )}
      {tab === "locations" && (
        <ReferenceManager key="locations" kind="locations" />
      )}
      {tab === "users" && <UserManager />}
    </div>
  );
}
function Overview() {
  const { categoryById, locationById } = useReference();
  const reports = useData().reports;
  const claims = useData().claims;
  const categories = useData().categories;
  const locations = useData().locations;
  const enriched = useEnrichedItems();

  const lost = reports.filter((r) => r.kind === "lost");
  const matchPairs = lost.reduce(
    (acc, l) => acc + findMatches(l, reports).length,
    0,
  );
  const returned = enriched.filter((e) => e.status === "RETURNED").length;
  const activeClaims = claims.filter(
    (c) =>
      c.status === "PENDING" ||
      c.status === "UNDER_REVIEW" ||
      c.status === "APPROVED",
  ).length;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports)
      map.set(r.categoryId, (map.get(r.categoryId) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const byLocation = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports)
      map.set(r.locationId, (map.get(r.locationId) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports]);

  const claimByStatus = useMemo(() => {
    return (
      Object.keys(CLAIM_STATUS_META) as (keyof typeof CLAIM_STATUS_META)[]
    ).map((s) => ({
      status: s,
      count: claims.filter((c) => c.status === s).length,
    }));
  }, [claims]);

  const maxCat = byCategory[0]?.[1] ?? 1;
  const maxLoc = byLocation[0]?.[1] ?? 1;
  const maxClaim = Math.max(1, ...claimByStatus.map((c) => c.count));

  const stats = [
    { label: T.stats.lost, value: lost.length, color: "text-rose-600" },
    {
      label: T.stats.found,
      value: reports.length - lost.length,
      color: "text-teal-600",
    },
    { label: T.stats.matches, value: matchPairs, color: "text-amber-600" },
    {
      label: T.stats.activeClaims,
      value: activeClaims,
      color: "text-violet-600",
    },
    { label: T.stats.returned, value: returned, color: "text-green-600" },
    { label: T.stats.total, value: reports.length, color: "text-slate-700" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
            <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="h-4 w-4 text-brand-600" /> {T.claims}
          </h3>
          <Link
            to="/claims"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {T.reviewClaims}
          </Link>
        </div>
        <div className="mt-4 space-y-2">
          {claimByStatus.map(({ status, count }) => (
            <Bar
              key={status}
              label={CLAIM_STATUS_META[status].label}
              value={count}
              max={maxClaim}
              color={
                status === "REJECTED"
                  ? "#ef4444"
                  : status === "COMPLETED"
                    ? "#14b8a6"
                    : "#f97316"
              }
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900">{T.byCategory}</h3>
          <div className="mt-4 space-y-2">
            {byCategory.map(([id, count]) => {
              const cat = categoryById(id);
              return (
                <Bar
                  key={id}
                  label={cat.name}
                  value={count}
                  max={maxCat}
                  color={cat.color}
                />
              );
            })}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-slate-900">{T.byLocation}</h3>
          <div className="mt-4 space-y-2">
            {byLocation.map(([id, count]) => (
              <Bar
                key={id}
                label={locationById(id)?.name ?? id}
                value={count}
                max={maxLoc}
                color="#f97316"
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {T.counts(categories.length, locations.length)}
      </p>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-xs text-slate-500">
        {label}
      </span>
      <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(value / max) * 100}%`, background: color }}
        />
      </div>
      <span className="w-5 shrink-0 text-right text-xs font-semibold text-slate-600">
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reports moderation
// ---------------------------------------------------------------------------

function ReportsTable() {
  const { reports } = useData();
  const { categoryById, locationById } = useReference();
  const action = useAction();
  const [filter, setFilter] = useState("ALL");
  async function moderate(
    report: Report,
    operation: "hide" | "restore" | "close" | "reopen",
  ) {
    if (action.busy) return;
    const reason = operation === "hide" ? window.prompt("Lý do ẩn tin:") : "";
    if (reason === null) return;
    await action.run(() => moderateReport(report, operation, reason));
  }
  async function remove(report: Report) {
    if (!window.confirm(T.deleteReportConfirm(report.itemName))) return;
    await action.run(async () => {
      const path = await deleteReport(report.id);
      await cleanupImage(path);
    });
  }
  return (
    <div className="card space-y-4 p-5">
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error}
        </p>
      )}
      <label className="block text-sm">
        Hiển thị
        <select
          className="input mt-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">Tất cả</option>
          <option value="VISIBLE">Đang hiển thị</option>
          <option value="HIDDEN">Đã ẩn</option>
        </select>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="p-3">Vật phẩm</th>
              <th className="p-3">Danh mục / địa điểm</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {reports
              .filter((r) => filter === "ALL" || r.moderationStatus === filter)
              .map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-3">
                    <Link
                      className="font-semibold text-brand-700"
                      to={"/items/" + report.id}
                    >
                      {report.itemName}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {report.kind === "lost" ? "Tin mất" : "Tin nhặt được"} ·{" "}
                      {report.reporterName}
                    </p>
                  </td>
                  <td className="p-3">
                    {categoryById(report.categoryId).name}
                    <p className="text-xs">
                      {locationById(report.locationId)?.name}
                    </p>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={report.status} />
                    <p className="mt-1 text-xs">
                      {report.moderationStatus === "HIDDEN"
                        ? "Đã ẩn: " + report.moderationReason
                        : "Đang hiển thị"}
                    </p>
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={action.busy}
                        onClick={() => {
                          void moderate(
                            report,
                            report.moderationStatus === "HIDDEN"
                              ? "restore"
                              : "hide",
                          );
                        }}
                      >
                        {report.moderationStatus === "HIDDEN"
                          ? "Hiện tin"
                          : "Ẩn tin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={action.busy || report.status === "RETURNED"}
                        onClick={() => {
                          void moderate(
                            report,
                            report.status === "CLOSED" ? "reopen" : "close",
                          );
                        }}
                      >
                        {report.status === "CLOSED" ? "Mở lại" : "Đóng tin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={action.busy}
                        onClick={() => {
                          void remove(report);
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ReferenceManager({ kind }: { kind: "categories" | "locations" }) {
  const { categories, locations, reports } = useData();
  const action = useAction();
  const [open, setOpen] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    emoji: "📦",
    color: "#64748b",
    kind: "building" as "building" | "area",
  });
  const items = kind === "categories" ? categories : locations;
  function start(id?: string) {
    const item = items.find((i) => i.id === id);
    setEditingId(id ?? null);
    setForm({
      name: item?.name ?? "",
      emoji: item && "emoji" in item ? item.emoji : "📦",
      color: item && "color" in item ? item.color : "#64748b",
      kind: item && "kind" in item ? item.kind : "building",
    });
    setOpen(true);
  }
  async function save() {
    if (action.busy || !form.name.trim()) return;
    const id = editingId ?? crypto.randomUUID();
    if (
      await action.run(() =>
        kind === "categories"
          ? saveCategory(
              {
                id,
                name: form.name.trim(),
                emoji: form.emoji || "📦",
                color: form.color,
              },
              !editingId,
            )
          : saveLocation(
              { id, name: form.name.trim(), kind: form.kind },
              !editingId,
            ),
      )
    )
      setOpen(false);
  }
  return (
    <div className="space-y-4">
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error}
        </p>
      )}
      <Button onClick={() => start()}>
        Thêm {kind === "categories" ? "danh mục" : "địa điểm"}
      </Button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const count = reports.filter(
            (r) =>
              (kind === "categories" ? r.categoryId : r.locationId) === item.id,
          ).length;
          return (
            <div className="card space-y-3 p-4" key={item.id}>
              <p className="font-semibold">
                {"emoji" in item ? item.emoji + " " : ""}
                {item.name}
              </p>
              <p className="text-xs text-slate-500">
                {count} tin đăng
                {"kind" in item
                  ? " · " + (item.kind === "building" ? "Toà nhà" : "Khu vực")
                  : ""}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => start(item.id)}
                >
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={action.busy || count > 0}
                  onClick={() => {
                    if (window.confirm("Xóa " + item.name + "?"))
                      void action.run(() =>
                        kind === "categories"
                          ? deleteCategory(item.id)
                          : deleteLocation(item.id),
                      );
                  }}
                >
                  Xóa
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Modal
        open={open}
        onClose={() => {
          if (!action.busy) setOpen(false);
        }}
        title={editingId ? "Chỉnh sửa" : "Thêm mới"}
        footer={
          <>
            <Button
              variant="ghost"
              disabled={action.busy}
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button
              disabled={action.busy || !form.name.trim()}
              onClick={() => {
                void save();
              }}
            >
              Lưu
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {action.error && (
            <p role="alert" className="text-red-700">
              {action.error}
            </p>
          )}
          <Field label="Tên" required>
            <input
              className="input"
              maxLength={120}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          {kind === "categories" ? (
            <div className="flex gap-3">
              <Field label="Biểu tượng">
                <input
                  className="input"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                />
              </Field>
              <Field label="Màu">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </Field>
            </div>
          ) : (
            <Field label="Loại">
              <select
                className="input"
                value={form.kind}
                onChange={(e) =>
                  setForm({
                    ...form,
                    kind: e.target.value as "building" | "area",
                  })
                }
              >
                <option value="building">Toà nhà</option>
                <option value="area">Khu vực</option>
              </select>
            </Field>
          )}
        </div>
      </Modal>
    </div>
  );
}
function UserManager() {
  const { profile } = useAuth();
  const action = useAction();
  const query = useQuery({
    queryKey: ["data", profile!.id, profile!.role, "profiles"],
    queryFn: ({ signal }) => getProfiles(signal),
  });
  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold">Quyền tài khoản</h2>
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error}
        </p>
      )}
      {query.error ? (
        <p role="alert">
          Không thể tải tài khoản.{" "}
          <button
            onClick={() => {
              void query.refetch();
            }}
          >
            Thử lại
          </button>
        </p>
      ) : query.isPending ? (
        <p>Đang tải…</p>
      ) : (
        query.data.map((user) => (
          <div
            key={user.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
          >
            <div>
              <p>{user.fullName}</p>
              <p className="text-xs text-slate-400">{user.id}</p>
            </div>
            <select
              aria-label={"Quyền của " + user.fullName}
              className="input w-auto"
              value={user.role}
              disabled={action.busy}
              onChange={(e) => {
                const role = e.target.value as "member" | "admin";
                if (window.confirm("Thay đổi quyền tài khoản này?"))
                  void action.run(() => setRole(user.id, role));
              }}
            >
              <option value="member">Thành viên</option>
              <option value="admin">Quản trị</option>
            </select>
          </div>
        ))
      )}
    </div>
  );
}
