import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  HandHeart,
  PackagePlus,
  PackageSearch,
  Search,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useData } from "@/lib/data";
import { useEnrichedItems } from "@/lib/useItems";
import { findMatches } from "@/lib/matching";
import { ItemCard } from "@/components/ItemCard";
import { Button } from "@/components/ui/Button";
import { HOME as T } from "@/lib/i18n";

const STATS = [
  { key: "lost", label: T.stats.lost, color: "text-rose-600" },
  { key: "found", label: T.stats.found, color: "text-teal-600" },
  { key: "matches", label: T.stats.matches, color: "text-amber-600" },
  { key: "returned", label: T.stats.returned, color: "text-green-600" },
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const reports = useData().reports.filter(
    (r) => r.moderationStatus === "VISIBLE",
  );
  const enriched = useEnrichedItems().filter(
    (e) => e.report.moderationStatus === "VISIBLE",
  );
  const [q, setQ] = useState("");

  const lost = reports.filter((r) => r.kind === "lost");
  const found = reports.filter((r) => r.kind === "found");
  const matchPairs = lost.reduce(
    (acc, l) => acc + findMatches(l, reports).length,
    0,
  );
  const returned = enriched.filter((e) => e.status === "RETURNED").length;

  const stats: Record<string, number> = {
    lost: lost.length,
    found: found.length,
    matches: matchPairs,
    returned,
  };

  const latest = [...enriched]
    .sort((a, b) => b.report.createdAt.localeCompare(a.report.createdAt))
    .slice(0, 6);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    navigate(`/items?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 px-6 py-12 text-white shadow-lg sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 right-40 h-56 w-56 rounded-full bg-brand-400/20 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-inset ring-white/20">
            <Sparkles className="h-3.5 w-3.5" /> {T.badge}
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {T.title}
          </h1>
          <p className="mt-3 text-sm text-brand-50 sm:text-base">
            {T.subtitle}
          </p>

          <form onSubmit={submitSearch} className="mt-6 flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={T.searchPlaceholder}
                className="w-full rounded-xl border-0 bg-white py-3 pl-9 pr-3 text-sm text-slate-800 shadow-md outline-none ring-2 ring-transparent transition focus:ring-white/60"
              />
            </div>
            <Button
              type="submit"
              className="bg-slate-900 px-4 py-3 text-white hover:bg-slate-800"
            >
              {T.search}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/report-lost"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
            >
              <PackagePlus className="h-4 w-4" /> {T.reportLost}
            </Link>
            <Link
              to="/report-found"
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition hover:bg-white/25"
            >
              <HandHeart className="h-4 w-4" /> {T.reportFound}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.key} className="card p-5">
            <p className={`text-3xl font-extrabold ${s.color}`}>
              {stats[s.key]}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">{T.howItWorks}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: PackageSearch,
              title: T.step1Title,
              text: T.step1Text,
            },
            {
              icon: Sparkles,
              title: T.step2Title,
              text: T.step2Text,
            },
            {
              icon: ShieldCheck,
              title: T.step3Title,
              text: T.step3Text,
            },
          ].map((step) => (
            <div key={step.title} className="card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{T.latest}</h2>
          <Link
            to="/items"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            {T.viewAll} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map(({ report, status, bestMatch }) => (
            <ItemCard
              key={report.id}
              report={report}
              status={status}
              bestMatch={bestMatch}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
