import type { CampusLocation, CurrentHolder } from '@/types';
import { COMMON } from '@/lib/i18n';

export const CURRENT_HOLDER_OPTIONS: { value: CurrentHolder; label: string }[] = [
  { value: 'finder', label: 'Người nhặt được (bạn đang giữ)' },
  { value: 'security-desk', label: 'Bàn bảo vệ' },
  { value: 'student-services', label: 'Phòng Công tác Sinh viên' },
];

export function holderLabel(holder: CurrentHolder): string {
  return (
    CURRENT_HOLDER_OPTIONS.find((o) => o.value === holder)?.label ?? holder
  );
}

/** "Toà nhà" / "Khu vực" — the campus-location kind, for admin lists. */
export function locationKindLabel(kind: CampusLocation['kind']): string {
  return kind === 'building' ? COMMON.building : COMMON.area;
}
