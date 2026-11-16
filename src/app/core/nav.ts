import { PageId } from './models';

export interface NavItem { id: PageId; label: string; icon: string; badge?: 'kycPending' | 'withdrawalsPending' }

export const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dash' },
  { id: 'users', label: 'Users', icon: 'users' },
  { id: 'kyc', label: 'KYC review', icon: 'kyc', badge: 'kycPending' },
  { id: 'deposits', label: 'Deposits', icon: 'dep' },
  { id: 'withdrawals', label: 'Withdrawals', icon: 'wd', badge: 'withdrawalsPending' },
  { id: 'content', label: 'Banners & announcements', icon: 'content' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
