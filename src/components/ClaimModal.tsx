import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FoundReport } from "@/types";
import { useData, useAction } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { submitClaim } from "@/lib/api/claims";
import { formatDate } from "@/lib/utils";
import { CLAIM_MODAL as T, COMMON } from "@/lib/i18n";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Field } from "./ui/Field";

export function ClaimModal({
  foundItem,
  onClose,
}: {
  foundItem: FoundReport;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { reports } = useData();
  const { profile } = useAuth();
  const action = useAction();

  const myLostReports = reports.filter(
    (r) =>
      r.kind === "lost" &&
      r.moderationStatus === "VISIBLE" &&
      r.reporterId === profile!.id &&
      r.status !== "RETURNED" &&
      r.status !== "CLOSED",
  );

  const claimantName = profile!.fullName;
  const [explanation, setExplanation] = useState("");
  const [distinguishing, setDistinguishing] = useState("");
  const [proof, setProof] = useState("");
  const [contact, setContact] = useState("");
  const [lostItemId, setLostItemId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    if (action.busy) return;
    const next: Record<string, string> = {};
    if (!claimantName.trim()) next.claimantName = T.nameRequired;
    if (!explanation.trim()) next.explanation = T.whyRequired;
    if (!distinguishing.trim()) next.distinguishing = T.distinguishingRequired;
    if (!contact.trim()) next.contact = T.contactRequired;
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    if (
      await action.run(() =>
        submitClaim({
          found_item_id: foundItem.id,
          lost_item_id: lostItemId || null,
          explanation: explanation.trim(),
          distinguishing_characteristics: distinguishing.trim(),
          proof_of_ownership: proof.trim() || null,
          contact_info: contact.trim(),
        }),
      )
    ) {
      onClose();
      navigate("/my-reports", { state: { claimed: true } });
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={T.title(foundItem.itemName)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {COMMON.cancel}
          </Button>
          <Button
            disabled={action.busy}
            onClick={() => {
              void submit();
            }}
          >
            {T.submit}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {action.error && (
          <p role="alert" className="text-sm text-red-700">
            {action.error}
          </p>
        )}
        <p className="text-sm text-slate-500">{T.intro}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={T.yourName} required error={errors.claimantName}>
            <input className="input" value={claimantName} readOnly />
          </Field>
          <Field label={T.contact} required error={errors.contact}>
            <input
              className="input"
              placeholder={T.contactPlaceholder}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label={T.whyYours}
          required
          error={errors.explanation}
          hint={T.whyHint}
        >
          <textarea
            className="input min-h-[80px] resize-y"
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
          />
        </Field>

        <Field
          label={T.distinguishing}
          required
          error={errors.distinguishing}
          hint={T.distinguishingHint}
        >
          <textarea
            className="input min-h-[72px] resize-y"
            value={distinguishing}
            onChange={(e) => setDistinguishing(e.target.value)}
          />
        </Field>

        <Field label={T.proof} hint={T.proofHint}>
          <textarea
            className="input min-h-[60px] resize-y"
            placeholder={T.proofPlaceholder}
            value={proof}
            onChange={(e) => setProof(e.target.value)}
          />
        </Field>

        {myLostReports.length > 0 && (
          <Field label={T.linkLost} hint={T.linkLostHint}>
            <select
              className="input"
              value={lostItemId}
              onChange={(e) => setLostItemId(e.target.value)}
            >
              <option value="">{COMMON.none}</option>
              {myLostReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.itemName} — {formatDate(r.date)}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
    </Modal>
  );
}
