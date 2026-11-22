// The admin menu: one entry per page, in the order shown in the sidebar.
// "badge" names a count from UiStore.meta() that is shown next to the item (e.g. pending KYC requests).
import { PageId } from './models';

export interface NavItem {
  id: PageId;
  label: string;
  icon: string; // a key of ICON in components/icon.component.ts
  badge?: 'kycPending' | 'withdrawalsPending';
}

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dash' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'kyc', label: 'KYC review', icon: 'kyc', badge: 'kycPending' },
  { id: 'deposits', label: 'Deposits', icon: 'dep' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'wd', badge: 'withdrawalsPending' },
  { id: 'content', label: 'Banners & announcements', icon: 'content' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
