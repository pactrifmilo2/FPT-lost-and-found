import type { ClaimStatus, FoundStatus, LostStatus } from '@/types';
import { CLAIM_STATUS_META, REPORT_STATUS_META, type StatusMeta } from '@/lib/meta';
import { UNKNOWN_STATUS } from '@/lib/i18n';
import { classNames } from '@/lib/utils';

const FALLBACK: StatusMeta = { label: UNKNOWN_STATUS, dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 ring-slate-200' };

export function StatusBadge({
  status,
  kind = 'report',
}: {
  status: LostStatus | FoundStatus | ClaimStatus | string;
  kind?: 'report' | 'claim';
}) {
  const meta =
    kind === 'claim'
      ? CLAIM_STATUS_META[status as ClaimStatus]
      : REPORT_STATUS_META[status as LostStatus | FoundStatus];
  const m = meta ?? FALLBACK;
  return (
    <span className={classNames('chip ring-1 ring-inset', m.chip)}>
      <span className={classNames('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}
