import type { ClaimStatus, FoundStatus, LostStatus } from '@/types';
import { KIND_LABEL, STATUS_LABEL } from '@/lib/i18n';

export interface StatusMeta {
  label: string;
  dot: string;
  chip: string;
}

export const REPORT_STATUS_META: Record<LostStatus | FoundStatus, StatusMeta> = {
  LOST: { label: STATUS_LABEL.LOST, dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  AVAILABLE: { label: STATUS_LABEL.AVAILABLE, dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  POSSIBLE_MATCH: { label: STATUS_LABEL.POSSIBLE_MATCH, dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  CLAIM_IN_PROGRESS: { label: STATUS_LABEL.CLAIM_IN_PROGRESS, dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  RETURNED: { label: STATUS_LABEL.RETURNED, dot: 'bg-green-600', chip: 'bg-green-50 text-green-700 ring-green-200' },
  CLOSED: { label: STATUS_LABEL.CLOSED, dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export const CLAIM_STATUS_META: Record<ClaimStatus, StatusMeta> = {
  PENDING: { label: STATUS_LABEL.PENDING, dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200' },
  UNDER_REVIEW: { label: STATUS_LABEL.UNDER_REVIEW, dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  APPROVED: { label: STATUS_LABEL.APPROVED, dot: 'bg-green-600', chip: 'bg-green-50 text-green-700 ring-green-200' },
  REJECTED: { label: STATUS_LABEL.REJECTED, dot: 'bg-red-500', chip: 'bg-red-50 text-red-700 ring-red-200' },
  COMPLETED: { label: STATUS_LABEL.COMPLETED, dot: 'bg-teal-500', chip: 'bg-teal-50 text-teal-700 ring-teal-200' },
};

export const KIND_META = {
  lost: { label: KIND_LABEL.lost, chip: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' },
  found: { label: KIND_LABEL.found, chip: 'bg-teal-50 text-teal-700 ring-teal-200', dot: 'bg-teal-500' },
} as const;
