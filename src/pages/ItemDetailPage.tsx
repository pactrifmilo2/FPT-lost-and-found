import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  HandHeart,
  MapPin,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { useData } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { effectiveStatus, findMatches } from "@/lib/matching";
import { holderLabel } from "@/data/reference";
import { useReference } from "@/lib/useReference";
import { CLAIM_STATUS_META, KIND_META } from "@/lib/meta";
import { classNames, formatDate, formatTime } from "@/lib/utils";
import { DETAIL as T } from "@/lib/i18n";
import { CategoryThumb } from "@/components/CategoryThumb";
import { StatusBadge } from "@/components/StatusBadge";
import { MatchCard } from "@/components/MatchCard";
import { ClaimModal } from "@/components/ClaimModal";
import { EditPhotoModal } from "@/components/EditPhotoModal";
import { Button } from "@/components/ui/Button";
import { PrivateInfo } from "@/components/PrivateInfo";
import { EmptyState } from "@/components/ui/EmptyState";

export function ItemDetailPage() {
  const { categoryById, locationById } = useReference();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { profile } = useAuth();
  const role = profile!.role;
  const reports = useData().reports;
  const claims = useData().claims;
  const [claimOpen, setClaimOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  const report = reports.find((r) => r.id === id);

  if (!report) {
    return (
      <EmptyState
        title={T.notFoundTitle}
        description={T.notFoundDescription}
        action={
          <Link to="/items">
            <Button variant="outline">{T.backToBrowse}</Button>
          </Link>
        }
      />
    );
  }

  const justCreated = (location.state as { justCreated?: boolean } | null)
    ?.justCreated;
  const matches = findMatches(report, reports);
  const status = effectiveStatus(report, reports);
  const category = categoryById(report.categoryId);
  const loc = locationById(report.locationId);

  const itemClaims = claims.filter((c) => c.foundItemId === report.id);
  const myClaim = itemClaims.find((c) => c.claimantId === profile!.id);
  const isOpen =
    report.moderationStatus === "VISIBLE" &&
    report.status !== "RETURNED" &&
    report.status !== "CLOSED";
  const canEdit =
    (report.reporterId === profile!.id || role === "admin") &&
    report.status !== "RETURNED" &&
    report.status !== "CLOSED" &&
    !claims.some(
      (c) =>
        (c.foundItemId === report.id || c.lostItemId === report.id) &&
        ["UNDER_REVIEW", "APPROVED", "COMPLETED"].includes(c.status),
    );

  return (
    <div className="space-y-6">
      <Link
        to="/items"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" /> {T.backToBrowse}
      </Link>

      {report.moderationStatus === "HIDDEN" && (
        <p
          role="status"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          Tin đã bị quản trị viên ẩn: {report.moderationReason}. Tin không xuất
          hiện trong tìm kiếm hoặc ghép nối.
        </p>
      )}
      {canEdit && (
        <Link
          className="inline-block text-sm font-semibold text-brand-700"
          to={"/items/" + report.id + "/edit"}
        >
          Chỉnh sửa tin
        </Link>
      )}
      {justCreated && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">{T.createdTitle}</p>
            <p className="text-green-700">{T.createdBody}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Main card */}
          <div className="card overflow-hidden">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
              <div className="relative shrink-0">
                <CategoryThumb
                  category={category}
                  imagePath={report.imagePath}
                  alt={report.itemName}
                  className="h-32 w-32 rounded-2xl text-4xl"
                />
                {canEdit && (
                  <button
                    onClick={() => setPhotoOpen(true)}
                    title={T.changePhoto}
                    className="absolute -bottom-1.5 -right-1.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-md ring-1 ring-slate-200 transition hover:text-brand-600"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={classNames(
                      "chip ring-1 ring-inset",
                      KIND_META[report.kind].chip,
                    )}
                  >
                    {KIND_META[report.kind].label}
                  </span>
                  <StatusBadge status={status} />
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {report.itemName}
                </h1>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{loc?.name ?? report.building}</span>
                  </div>
                  {report.building && report.building !== loc?.name && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{report.building}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>
                      {report.kind === "lost" ? T.lostOn : T.foundOn}{" "}
                      {formatDate(report.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                      {report.time
                        ? T.timeAround(formatTime(report.time))
                        : T.timeUnknown}
                    </span>
                  </div>
                  {report.kind === "lost" && report.floorRoom && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span>{report.floorRoom}</span>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="space-y-5 border-t border-slate-100 p-5">
              <section>
                <h2 className="text-sm font-semibold text-slate-900">
                  {T.description}
                </h2>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {report.description}
                </p>
              </section>

              {report.kind === "lost" ? (
                <section className="rounded-xl bg-slate-50 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {T.distinguishing}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {report.distinguishingCharacteristics}
                  </p>
                  <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3 text-sm text-slate-600">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>
                      {T.reportedBy}{" "}
                      <span className="font-medium">{report.reporterName}</span>{" "}
                      · {report.contactPreference}
                    </span>
                  </div>
                </section>
              ) : (
                <section>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {T.currentHolder}
                    </h2>
                    <span className="chip bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200">
                      {holderLabel(report.currentHolder)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>
                      {T.registeredBy}{" "}
                      <span className="font-medium">{report.reporterName}</span>
                    </span>
                  </div>

                  {role === "admin" && (
                    <div className="mt-4">
                      <PrivateInfo reportId={report.id} />
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>

          {/* Possible matches */}
          <section>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">
                {T.possibleMatches}{" "}
                <span className="text-sm font-medium text-slate-400">
                  ({matches.length})
                </span>
              </h2>
            </div>
            {matches.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-slate-500">
                {T.noMatches}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {matches.map((m) => (
                  <MatchCard
                    key={m.target.id}
                    match={m}
                    action={
                      <Link to={`/items/${m.target.id}`}>
                        <Button variant="outline" size="sm">
                          {T.openReport(m.target.kind)}
                        </Button>
                      </Link>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {report.kind === "found" ? (
            <>
              {role === "member" && (
                <div className="card p-5">
                  {myClaim ? (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 className="h-4 w-4 text-brand-600" />{" "}
                        {T.claimedTitle}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {T.statusPrefix}{" "}
                        <span
                          className={classNames(
                            "chip ring-1 ring-inset",
                            CLAIM_STATUS_META[myClaim.status].chip,
                          )}
                        >
                          {CLAIM_STATUS_META[myClaim.status].label}
                        </span>
                      </p>
                      <Link to="/my-reports">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 w-full"
                        >
                          {T.trackClaim}
                        </Button>
                      </Link>
                    </div>
                  ) : isOpen ? (
                    <div>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <HandHeart className="h-4 w-4 text-brand-600" />{" "}
                        {T.isThisYours}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {T.isThisYoursBody}
                      </p>
                      <Button
                        className="mt-3 w-full"
                        onClick={() => setClaimOpen(true)}
                      >
                        {T.claimButton}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {T.alreadyReturned}
                    </p>
                  )}
                </div>
              )}

              {role === "admin" && (
                <div className="card p-5">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-brand-600" />{" "}
                    {T.claimsOnItem}
                  </h3>
                  {itemClaims.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-500">{T.noClaims}</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {itemClaims.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-slate-700">
                            {c.claimantName}
                          </span>
                          <span
                            className={classNames(
                              "chip ring-1 ring-inset",
                              CLAIM_STATUS_META[c.status].chip,
                            )}
                          >
                            {CLAIM_STATUS_META[c.status].label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link to="/claims">
                    <Button variant="outline" size="sm" className="mt-3 w-full">
                      {T.manageClaims}
                    </Button>
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                {T.lostSomething}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {matches.length > 0
                  ? T.matchesFound(matches.length)
                  : T.noMatchesYet}
              </p>
            </div>
          )}

          <div className="card bg-brand-50/60 p-5 ring-1 ring-inset ring-brand-100">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-brand-700">{T.tipLabel}</span>{" "}
              {T.tipBody}
            </p>
          </div>
        </aside>
      </div>

      {claimOpen && report.kind === "found" && (
        <ClaimModal foundItem={report} onClose={() => setClaimOpen(false)} />
      )}

      {photoOpen && (
        <EditPhotoModal report={report} onClose={() => setPhotoOpen(false)} />
      )}
    </div>
  );
}
