import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { FoundStatus, LostStatus, Report } from "@/types";
import { useData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useEnrichedItems } from "@/lib/useItems";
import { CLAIM_STATUS_META, KIND_META } from "@/lib/meta";
import { useReference } from "@/lib/useReference";
import { classNames, formatDate, timeAgo } from "@/lib/utils";
import { MY_REPORTS as T } from "@/lib/i18n";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryThumb } from "@/components/CategoryThumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export function MyReportsPage() {
  const { categoryById } = useReference();
  const { profile } = useAuth();
  const location = useLocation();
  const reports = useData().reports;
  const claims = useData().claims;
  const enriched = useEnrichedItems();

  const claimedId = (location.state as { claimed?: string } | null)?.claimed;

  const myItems = enriched.filter((e) => e.report.reporterId === profile!.id);
  const myLost = myItems.filter((e) => e.report.kind === "lost");
  const myFound = myItems.filter((e) => e.report.kind === "found");
  const myClaims = claims.filter((c) => c.claimantId === profile!.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {T.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{T.subtitle}</p>
      </header>

      {claimedId && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{T.claimSubmittedTitle}</p>
            <p className="text-green-700">{T.claimSubmittedBody}</p>
          </div>
        </div>
      )}

      {/* Claims */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">{T.myClaims}</h2>
        {myClaims.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={T.noClaims}
              description={T.noClaimsDescription}
              action={
                <Link to="/items">
                  <Button variant="outline">{T.browseItems}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {myClaims.map((c) => {
              const found = reports.find((r) => r.id === c.foundItemId);
              const cat = found ? categoryById(found.categoryId) : undefined;
              return (
                <li key={c.id} className="card flex items-center gap-3 p-3">
                  {found && cat && (
                    <CategoryThumb
                      category={cat}
                      imagePath={found.imagePath}
                      alt={found.itemName}
                      className="h-12 w-12 rounded-xl"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">
                      {found?.itemName ?? T.itemRemoved}
                    </p>
                    <p className="text-xs text-slate-500">
                      {T.filed(timeAgo(c.createdAt))}
                    </p>
                  </div>
                  <span
                    className={classNames(
                      "chip ring-1 ring-inset",
                      CLAIM_STATUS_META[c.status].chip,
                    )}
                  >
                    {CLAIM_STATUS_META[c.status].label}
                  </span>
                  {found && (
                    <Link
                      to={`/items/${found.id}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Lost reports */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">{T.myLost}</h2>
        {myLost.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={T.nothingReported}
              description={T.noLostDescription}
              action={
                <Link to="/report-lost">
                  <Button variant="outline">{T.reportLost}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {myLost.map(({ report, status }) => (
              <ReportRow key={report.id} report={report} status={status} />
            ))}
          </ul>
        )}
      </section>

      {/* Found reports */}
      <section>
        <h2 className="text-lg font-bold text-slate-900">{T.myFound}</h2>
        {myFound.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title={T.nothingReported}
              description={T.noFoundDescription}
              action={
                <Link to="/report-found">
                  <Button variant="outline">{T.reportFound}</Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {myFound.map(({ report, status }) => (
              <ReportRow key={report.id} report={report} status={status} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReportRow({
  report,
  status,
}: {
  report: Report;
  status: LostStatus | FoundStatus;
}) {
  const { categoryById } = useReference();
  const cat = categoryById(report.categoryId);
  return (
    <li className="card flex items-center gap-3 p-3">
      <CategoryThumb
        category={cat}
        imagePath={report.imagePath}
        alt={report.itemName}
        className="h-12 w-12 rounded-xl"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={classNames(
              "chip ring-1 ring-inset",
              KIND_META[report.kind].chip,
            )}
          >
            {KIND_META[report.kind].label}
          </span>
          <p className="truncate font-medium text-slate-900">
            {report.itemName}
          </p>
        </div>
        <p className="text-xs text-slate-500">{formatDate(report.date)}</p>
      </div>
      <div className="space-y-1">
        <StatusBadge status={status} />
        {report.moderationStatus === "HIDDEN" && (
          <p className="text-xs text-red-700">
            Đã ẩn: {report.moderationReason}
          </p>
        )}
      </div>
      <Link
        to={`/items/${report.id}`}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </li>
  );
}
