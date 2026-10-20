import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useData } from "@/lib/data";
import { useEnrichedItems } from "@/lib/useItems";
import { useReference } from "@/lib/useReference";
import { REPORT_STATUS_META } from "@/lib/meta";
import { ItemCard } from "@/components/ItemCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { classNames } from "@/lib/utils";
import { BROWSE as T, COMMON, KIND_LABEL } from "@/lib/i18n";
import type { FoundStatus, LostStatus } from "@/types";

type KindFilter = "all" | "lost" | "found";
const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: "all", label: COMMON.all },
  { value: "lost", label: KIND_LABEL.lost },
  { value: "found", label: KIND_LABEL.found },
];

const STATUS_OPTIONS = Object.entries(REPORT_STATUS_META) as [
  LostStatus | FoundStatus,
  (typeof REPORT_STATUS_META)[LostStatus | FoundStatus],
][];

export function LostFoundPage() {
  const { buildings } = useReference();
  const [searchParams] = useSearchParams();
  const enriched = useEnrichedItems().filter(
    (e) => e.report.moderationStatus === "VISIBLE",
  );
  const categories = useData().categories;
  const locations = useData().locations;

  const [keyword, setKeyword] = useState(searchParams.get("q") ?? "");
  const [kind, setKind] = useState<KindFilter>("all");
  const [categoryId, setCategoryId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [building, setBuilding] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const hasFilters =
    keyword !== "" ||
    kind !== "all" ||
    categoryId !== "" ||
    locationId !== "" ||
    building !== "" ||
    status !== "" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return enriched
      .filter(({ report, status: st }) => {
        if (kind !== "all" && report.kind !== kind) return false;
        if (categoryId && report.categoryId !== categoryId) return false;
        if (locationId && report.locationId !== locationId) return false;
        if (building && report.building !== building) return false;
        if (status && st !== status) return false;
        if (dateFrom && report.date < dateFrom) return false;
        if (dateTo && report.date > dateTo) return false;
        if (kw) {
          const floorRoom = report.kind === "lost" ? report.floorRoom : "";
          const hay = [
            report.itemName,
            report.description,
            report.building,
            floorRoom,
          ]
            .join(" ")
            .toLowerCase();
          if (!hay.includes(kw)) return false;
        }
        return true;
      })
      .sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt));
  }, [
    enriched,
    keyword,
    kind,
    categoryId,
    locationId,
    building,
    status,
    dateFrom,
    dateTo,
  ]);

  function clearFilters() {
    setKeyword("");
    setKind("all");
    setCategoryId("");
    setLocationId("");
    setBuilding("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {T.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{T.subtitle}</p>
        </div>
        <span className="hidden text-sm text-slate-400 sm:block">
          {T.resultCount(filtered.length)}
        </span>
      </header>

      <div className="card space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder={T.keywordPlaceholder}
              className="input pl-9"
            />
          </div>
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            {KIND_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setKind(t.value)}
                className={classNames(
                  "rounded-[10px] px-4 py-1.5 text-sm font-medium transition",
                  kind === t.value
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" /> {T.clear}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <label className="col-span-1">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
              <SlidersHorizontal className="h-3 w-3" /> {T.category}
            </span>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{T.allCategories}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {T.location}
            </span>
            <select
              className="input"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">{T.allLocations}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {T.building}
            </span>
            <select
              className="input"
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            >
              <option value="">{T.allBuildings}</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-medium text-slate-500">
              {T.status}
            </span>
            <select
              className="input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{T.allStatuses}</option>
              {STATUS_OPTIONS.map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>

          <div className="col-span-2 grid grid-cols-2 gap-3 lg:col-span-1 lg:grid-cols-1">
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {T.from}
              </span>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                {T.to}
              </span>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10" />}
          title={T.emptyTitle}
          description={T.emptyDescription}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {T.clearAll}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(({ report, status: st, bestMatch }) => (
            <ItemCard
              key={report.id}
              report={report}
              status={st}
              bestMatch={bestMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
