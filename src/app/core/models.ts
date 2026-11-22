// TypeScript shapes of the data the admin panel works with.
// Each interface matches a JSON response from the backend API (halo-backend, server/src/routes).

/** The admin pages; also used as the menu item ids (see nav.ts). */
export type PageId = 'dashboard' | 'users' | 'kyc' | 'deposits' | 'withdrawals' | 'content' | 'settings';

export type KycStatus = 'verified' | 'pending' | 'none';

/** GET /api/meta: counts shown as badges in the sidebar. */
export interface Meta {
  kycPending: number;
  withdrawalsPending: number;
}

/** One row of GET /api/users. */
export interface UserRow {
  id: string;
  uuid: string;
  phone: string;
  name: string;
  vip: number;
  activeBalance: number; // "Active strategy" wallet
  flexBalance: number; // "Flexible" wallet
  teamSize: number;
  kycStatus: KycStatus;
  status: 'active' | 'frozen';
  joined: string;
}

/** A manual balance change made by an admin (shown in the user drawer). */
export interface Adjustment {
  wallet: string;
  note: string;
  amount: number;
  createdAt: string;
}

/** GET /api/users/:id */
export interface UserDetail {
  user: UserRow;
  adjustments: Adjustment[];
}

/** A person in a user's team (GET /api/users/:id/team). */
export interface Member {
  uuid: string;
  phone: string;
  vip: number;
  deposit: number;
  joined: string;
  active: boolean;
}

/** One generation of a user's team. */
export interface Level {
  name: string;
  rate: number;
  members: Member[];
  deposits: number;
  commission: number;
}

/** GET /api/users/:id/team */
export interface TeamData {
  totals: { size: number; direct: number; active: number; inactive: number; deposits: number; commission: number };
  upline: { phone: string; uuid: string } | null;
  levels: Level[];
}

/** One pending request of GET /api/kyc. */
export interface KycItem {
  id: string;
  name: string;
  phone: string;
  country: string;
  doc: string; // document type, e.g. "ID card"
  num: string; // document number
  submittedAt: string;
}

/** One deposit or withdrawal of GET /api/transactions. */
export interface Tx {
  id: string;
  txId: string;
  type: 'deposit' | 'withdrawal';
  user: { phone: string; uuid: string };
  network: string;
  address: string;
  amount: number;
  status: 'Pending' | 'Paid' | 'Credited' | 'Rejected';
  txHash: string;
  createdAt: string;
}

/** A home or popup banner (GET /api/content). */
export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  isLive: boolean;
}

/** The scrolling announcement text on the user app's home screen. */
export interface Announcement {
  text: string;
  isLive: boolean;
}

/** GET /api/content */
export interface ContentData {
  popup: Banner[];
  home: Banner[];
  announcement: Announcement;
}

/** GET /api/settings */
export interface Settings {
  feePercent: number;
  trialAmount: number;
  minDeposit: number;
  minWithdrawal: number;
  maintenance: { enabled: boolean; hours: number; startedAt: string | null };
  telegram: { official: string; support: string; community: string };
}

/** GET /api/dashboard/kpis: the numbers on the dashboard cards. */
export interface Kpis {
  totalUsers: number;
  activeToday: number;
  userBalances: number;
  depositsCredited: number;
  pendingWithdrawals: { count: number; amount: number };
  feeRevenue: number;
  feePercent: number;
}
