export type PageId = 'dashboard' | 'users' | 'kyc' | 'deposits' | 'withdrawals' | 'content' | 'settings';
export type KycStatus = 'verified' | 'pending' | 'none';

export interface Meta { kycPending: number; withdrawalsPending: number }

export interface UserRow {
  id: string; uuid: string; phone: string; name: string; vip: number;
  activeBalance: number; flexBalance: number; teamSize: number;
  kycStatus: KycStatus; status: 'active' | 'frozen'; joined: string;
}
export interface Adjustment { wallet: string; note: string; amount: number; createdAt: string }
export interface UserDetail { user: UserRow; adjustments: Adjustment[] }

export interface Member { uuid: string; phone: string; vip: number; deposit: number; joined: string; active: boolean }
export interface Level { name: string; rate: number; members: Member[]; deposits: number; commission: number }
export interface TeamData {
  totals: { size: number; direct: number; active: number; inactive: number; deposits: number; commission: number };
  upline: { phone: string; uuid: string } | null;
  levels: Level[];
}

export interface KycItem { id: string; name: string; phone: string; country: string; doc: string; num: string; submittedAt: string }

export interface Tx {
  id: string; txId: string; type: 'deposit' | 'withdrawal';
  user: { phone: string; uuid: string }; network: string; address: string;
  amount: number; status: 'Pending' | 'Paid' | 'Credited' | 'Rejected'; txHash: string; createdAt: string;
}

export interface Banner { id: string; title: string; subtitle: string; isLive: boolean }
export interface Announcement { text: string; isLive: boolean }
export interface ContentData { popup: Banner[]; home: Banner[]; announcement: Announcement }

export interface Settings {
  feePercent: number; trialAmount: number; minDeposit: number; minWithdrawal: number;
  maintenance: { enabled: boolean; hours: number; startedAt: string | null };
  telegram: { official: string; support: string; community: string };
}

export interface Kpis {
  totalUsers: number; activeToday: number; userBalances: number; depositsCredited: number;
  pendingWithdrawals: { count: number; amount: number }; feeRevenue: number; feePercent: number;
}
