import type { Role } from '@/types';
import { NAV } from '@/lib/i18n';

export interface NavItem {
  to: string;
  label: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  member: [
    { to: '/', label: NAV.home },
    { to: '/items', label: NAV.browse },
    { to: '/report-lost', label: NAV.reportLost },
    { to: '/report-found', label: NAV.reportFound },
    { to: '/my-reports', label: NAV.myReports },
    { to: '/claims', label: NAV.claims },
  ],
  admin: [
    { to: '/', label: NAV.home },
    { to: '/items', label: NAV.browse },
    { to: '/report-lost', label: NAV.reportLost },
    { to: '/report-found', label: NAV.reportFound },
    { to: '/my-reports', label: NAV.myReports },
    { to: '/claims', label: NAV.claims },
    { to: '/admin', label: NAV.admin },
  ],
};
