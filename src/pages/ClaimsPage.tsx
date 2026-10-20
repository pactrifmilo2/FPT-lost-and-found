import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, ShieldCheck, X } from "lucide-react";
import type { Claim, ClaimStatus, FoundReport } from "@/types";
import { useData, useAction } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { CLAIM_STATUS_META } from "@/lib/meta";
import { holderLabel } from "@/data/reference";
import { useReference } from "@/lib/useReference";
import { transitionClaim } from "@/lib/api/claims";
import { PrivateInfo } from "@/components/PrivateInfo";
import { classNames, formatDateTime } from "@/lib/utils";
import { CLAIMS_PAGE as T, COMMON } from "@/lib/i18n";
import { CategoryThumb } from "@/components/CategoryThumb";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

const FILTERS: { value: ClaimStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: COMMON.all },
  { value: "PENDING", label: CLAIM_STATUS_META.PENDING.label },
  { value: "UNDER_REVIEW", label: CLAIM_STATUS_META.UNDER_REVIEW.label },
  { value: "APPROVED", label: CLAIM_STATUS_META.APPROVED.label },
  { value: "REJECTED", label: CLAIM_STATUS_META.REJECTED.label },
  { value: "COMPLETED", label: CLAIM_STATUS_META.COMPLETED.label },
];

export function ClaimsPage() {
  const claims = useData().claims;
  const action = useAction();
  const { profile } = useAuth();

  const [filter, setFilter] = useState<ClaimStatus | "ALL">("ALL");

  const visible = useMemo(
    () =>
      claims
        .filter((c) => filter === "ALL" || c.status === filter)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [claims, filter],
  );

  async function handleAction(
    claim: Claim,
    next: "review" | "approve" | "reject" | "complete" | "reopen",
    note?: string,
  ) {
    if (action.busy) return;
    await action.run(() => transitionClaim(claim, next, note));
  }

  return (
    <div className="space-y-6">
      {action.error && (
        <p role="alert" className="text-sm text-red-700">
          {action.error}
        </p>
      )}
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <ShieldCheck className="h-6 w-6 text-brand-600" /> {T.title}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{T.subtitle}</p>
      </header>

      <div className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={classNames(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              filter === f.value
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-10 w-10" />}
          title={T.emptyTitle}
          description={T.emptyDescription}
        />
      ) : (
        <div className="space-y-4">
          {visible.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onAction={handleAction}
              isAdmin={profile!.role === "admin"}
              busy={action.busy}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClaimCard({
  claim,
  onAction,
  isAdmin,
  busy,
}: {
  claim: Claim;
  onAction: (
    claim: Claim,
    action: "review" | "approve" | "reject" | "complete" | "reopen",
    note?: string,
  ) => Promise<void>;
  isAdmin: boolean;
  busy: boolean;
}) {
  const { categoryById } = useReference();
  const reports = useData().reports;
  const [note, setNote] = useState(claim.staffNote ?? "");
  const found = reports.find(
    (r): r is FoundReport => r.id === claim.foundItemId && r.kind === "found",
  );
  const lost = claim.lostItemId
    ? reports.find((r) => r.id === claim.lostItemId)
    : undefined;
  const cat = found ? categoryById(found.categoryId) : undefined;

  const meta = CLAIM_STATUS_META[claim.status];

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {found && cat && (
            <CategoryThumb
              category={cat}
              imagePath={found.imagePath}
              alt={found.itemName}
              className="h-12 w-12 rounded-xl"
            />
          )}
          <div>
            <p className="font-semibold text-slate-900">
              {found ? (
                <Link
                  to={`/items/${found.id}`}
                  className="hover:text-brand-700"
                >
                  {found.itemName}
                </Link>
              ) : (
                T.itemRemoved
              )}
            </p>
            <p className="text-xs text-slate-500">
              {T.claimBy}{" "}
              <span className="font-medium text-slate-700">
                {claim.claimantName}
              </span>{" "}
              · {formatDateTime(claim.createdAt)}
              {found && <> · {T.heldBy(holderLabel(found.currentHolder))}</>}
            </p>
          </div>
        </div>
        <span className={classNames("chip ring-1 ring-inset", meta.chip)}>
          {meta.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {T.explanation}
            </h4>
            <p className="mt-1 text-sm text-slate-700">{claim.explanation}</p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {T.claimantDetails}
            </h4>
            <p className="mt-1 text-sm text-slate-700">
              {claim.distinguishingCharacteristics}
            </p>
          </div>
          {claim.proofOfOwnership && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {T.proof}
              </h4>
              <p className="mt-1 text-sm text-slate-700">
                {claim.proofOfOwnership}
              </p>
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {T.contact}
            </h4>
            <p className="mt-1 text-sm text-slate-700">{claim.contactInfo}</p>
          </div>
        </div>

        <div className="space-y-3">
          {found && isAdmin && <PrivateInfo reportId={found.id} />}
          {lost && (
            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {T.linkedLost}
              </h4>
              <Link
                to={`/items/${lost.id}`}
                className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline"
              >
                {lost.itemName} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {claim.staffNote && (
        <p className="mt-4 text-sm text-slate-700">
          Phản hồi: {claim.staffNote}
        </p>
      )}
      {isAdmin && (
        <>
          <label className="mt-4 block text-sm">
            Phản hồi cho người yêu cầu
            <textarea
              className="input mt-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {claim.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "review", note);
                  }}
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> {T.startReview}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "reject", note);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> {T.reject}
                </Button>
              </>
            )}
            {claim.status === "UNDER_REVIEW" && (
              <>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "approve", note);
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> {T.approve}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "reject", note);
                  }}
                >
                  <X className="h-3.5 w-3.5" /> {T.reject}
                </Button>
              </>
            )}
            {claim.status === "APPROVED" && (
              <>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "reject", note);
                  }}
                >
                  Từ chối
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    void onAction(claim, "complete", note);
                  }}
                >
                  <Check className="h-3.5 w-3.5" /> {T.confirmHandover}
                </Button>
              </>
            )}
            {claim.status === "REJECTED" && (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  void onAction(claim, "reopen", note);
                }}
              >
                {T.reopen}
              </Button>
            )}
            {claim.status === "COMPLETED" && (
              <span className="text-sm font-medium text-green-600">
                {T.completed}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
