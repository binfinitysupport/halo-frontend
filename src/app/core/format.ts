export const GAS_RATE = 0.06; // withdrawal gas, 6% (as in the prototype)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n: number): string => String(n).padStart(2, '0');

export const fmt = (n: number | null | undefined, d = 2): string =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export const initials = (name = ''): string => name.split(' ').map((x) => x[0]).join('');

export const dateOnly = (d: string | Date): string => new Date(d).toISOString().slice(0, 10);

export const shortDateTime = (d: string | Date): string => {
  const x = new Date(d);
  return `${MONTHS[x.getUTCMonth()]} ${p2(x.getUTCDate())}, ${p2(x.getUTCHours())}:${p2(x.getUTCMinutes())}`;
};

export const minutesAgo = (d: string | Date): string =>
  `${Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))} min ago`;

const TAG: Record<string, [string, string]> = {
  green: ['rgba(22,199,132,.15)', '#16C784'],
  amber: ['rgba(245,165,36,.15)', '#F5A524'],
  red: ['rgba(234,57,67,.15)', '#EA3943'],
  neutral: ['#1E1F23', 'rgba(255,255,255,.6)'],
  white: ['#1E1F23', '#fff'],
  blue: ['rgba(10,99,241,.18)', '#8DB6FF'],
};

export const tagStyle = (key?: string): { background: string; color: string } => {
  const [background, color] = (key && TAG[key]) || TAG['white'];
  return { background, color };
};

export const TX_TAG: Record<string, string> = { Credited: 'green', Paid: 'green', Pending: 'amber', Rejected: 'red' };
export const KYC_TAG: Record<string, string> = { verified: 'green', pending: 'amber', none: 'neutral' };
export const KYC_LABEL: Record<string, string> = { verified: 'Verified', pending: 'Pending', none: 'Not started' };
