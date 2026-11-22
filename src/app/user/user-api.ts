// Connects the B-Infinity user app to the backend's user API (/api/app/...).
// Hand-written (not generated): the converter never overwrites this file.
// It keeps the login token in the browser and turns server responses into the shapes the screens use.
import { environment } from '../../environments/environment';

const SESSION_STORAGE_KEY = 'halo.userSession';

// Error from the API: the message is shown to the user as it is.
export class UserApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

interface StoredSession {
  token: string;
  expiresAt: number;
}

export class UserApi {
  private readonly baseUrl = environment.apiUrl + '/app';

  hasSession(): boolean {
    return this.readSession() !== null;
  }

  register(form: { countryIso: string; phone: string; email: string; password: string; fundPassword: string; inviteCode: string }) {
    return this.request<any>('POST', '/auth/register', form).then((result) => this.keepSession(result));
  }

  login(form: { email?: string; phone?: string; countryIso?: string; password: string }) {
    return this.request<any>('POST', '/auth/login', form).then((result) => this.keepSession(result));
  }

  logout() {
    return this.request<any>('POST', '/auth/logout').finally(() => this.clearSession());
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('POST', '/auth/password', { currentPassword, newPassword });
  }

  me() {
    return this.request<any>('GET', '/me');
  }

  wallets() {
    return this.request<any>('GET', '/wallets');
  }

  bills(filter: string) {
    return this.request<any[]>('GET', '/bills?type=' + encodeURIComponent(filter));
  }

  createDeposit(option: string, amount: number) {
    return this.request<any>('POST', '/deposits', { option, amount });
  }

  depositStatus(trackId: string) {
    return this.request<any>('GET', '/deposits/' + encodeURIComponent(trackId));
  }

  withdraw(form: { network: string; address: string; amount: number; fundPassword: string }) {
    return this.request<any>('POST', '/withdrawals', form);
  }

  transfer(form: { mode: 'user' | 'wallet'; recipientUuid?: string; amount: number; fundPassword: string }) {
    return this.request<any>('POST', '/transfers', form);
  }

  kycStatus() {
    return this.request<any>('GET', '/kyc');
  }

  submitKyc(form: { nationality: string; fullName: string; idType: string; idNumber: string; frontImage: string; backImage: string }) {
    return this.request<any>('POST', '/kyc', form);
  }

  content() {
    return this.request<any>('GET', '/content');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    const session = this.readSession();
    if (session) headers['Authorization'] = 'Bearer ' + session.token;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    let response: Response;
    try {
      response = await fetch(this.baseUrl + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new UserApiError('Cannot reach the server. Check your connection and try again.', 0);
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && session) this.clearSession();
      throw new UserApiError(json.message || 'Something went wrong. Please try again.', response.status);
    }
    return json as T;
  }

  private keepSession<T extends { token?: string; expiresAt?: number }>(result: T): T {
    if (result.token && result.expiresAt) {
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: result.token, expiresAt: result.expiresAt }));
      } catch {
        // storage unavailable: the user stays logged in until the page is reloaded
      }
    }
    return result;
  }

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // nothing to clear
    }
  }

  private readSession(): StoredSession | null {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      const session = JSON.parse(stored) as StoredSession;
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }
}

export const userApi = new UserApi();

// ---- Shapes used by the screens ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatBillDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Server profile → the user object the screens read (invite code is "code", country is "iso").
export const toScreenUser = (profile: any) => ({
  iso: profile.countryIso,
  phone: profile.phone,
  email: profile.email || '',
  uuid: profile.uuid,
  code: profile.inviteCode,
  name: profile.name,
});

// Ledger line → bill row. Server "kinds" are grouped into the bill filters the screens show.
const BILL_TYPE_BY_KIND: Record<string, string> = {
  recharge: 'Recharge',
  withdrawal: 'Withdrawal',
  withdrawal_refund: 'Withdrawal',
  transfer_in: 'Transfer',
  transfer_out: 'Transfer',
  wallet_transfer_in: 'Transfer',
  wallet_transfer_out: 'Transfer',
  admin_adjustment: 'Recharge',
};
const BILL_STATUS_TEXT: Record<string, string> = {
  Pending: 'Under review',
  Paid: 'Completed',
  Completed: 'Completed',
  Rejected: 'Rejected',
  Refunded: 'Refunded',
};

export const toScreenBill = (row: any) => ({
  type: BILL_TYPE_BY_KIND[row.kind] || 'Recharge',
  title: row.note || row.kind,
  date: formatBillDate(row.createdAt),
  amt: Number(row.amount),
  status: BILL_STATUS_TEXT[row.status] || 'Completed',
});
