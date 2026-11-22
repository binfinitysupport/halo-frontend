// Small helpers that turn raw values into display text: numbers, dates, initials and the
// colours of status "pills" (e.g. a green "Paid" tag). Used by the admin pages and components.

/** Withdrawal gas fee shown in the admin: 6% (as in the prototype). */
export const GAS_RATE = 0.06;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MS_PER_MINUTE = 60_000;

const padTwoDigits = (value: number): string => String(value).padStart(2, '0');

/** Number with thousands separators and fixed decimals, e.g. fmt(1234.5) -> "1,234.50". */
export const fmt = (value: number | null | undefined, decimals = 2): string =>
  Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/** "Aarav Mehta" -> "AM" (used in avatar circles). */
export const initials = (name = ''): string =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('');

/** "2026-11-05T09:12:03Z" -> "2026-11-05". */
export const dateOnly = (date: string | Date): string => new Date(date).toISOString().slice(0, 10);

/** "2026-11-05T09:12:03Z" -> "Nov 05, 09:12" (UTC). */
export const shortDateTime = (date: string | Date): string => {
  const parsed = new Date(date);
  const month = MONTHS[parsed.getUTCMonth()];
  const day = padTwoDigits(parsed.getUTCDate());
  const hours = padTwoDigits(parsed.getUTCHours());
  const minutes = padTwoDigits(parsed.getUTCMinutes());
  return `${month} ${day}, ${hours}:${minutes}`;
};

/** How long ago a date was, e.g. "12 min ago". */
export const minutesAgo = (date: string | Date): string => {
  const minutes = Math.round((Date.now() - new Date(date).getTime()) / MS_PER_MINUTE);
  return `${Math.max(0, minutes)} min ago`;
};

// Status pill colours: [background, text].
const TAG_COLORS: Record<string, [string, string]> = {
  green: ['rgba(22,199,132,.15)', '#16C784'],
  amber: ['rgba(245,165,36,.15)', '#F5A524'],
  red: ['rgba(234,57,67,.15)', '#EA3943'],
  neutral: ['#1E1F23', 'rgba(255,255,255,.6)'],
  white: ['#1E1F23', '#fff'],
  blue: ['rgba(10,99,241,.18)', '#8DB6FF'],
};

/** Inline style for a status pill of the given colour name (defaults to "white"). */
export const tagStyle = (key?: string): { background: string; color: string } => {
  const [background, color] = (key && TAG_COLORS[key]) || TAG_COLORS['white'];
  return { background, color };
};

/** Which pill colour each transaction status uses. */
export const TX_TAG: Record<string, string> = { Credited: 'green', Paid: 'green', Pending: 'amber', Rejected: 'red' };

/** Which pill colour and label each KYC status uses. */
export const KYC_TAG: Record<string, string> = { verified: 'green', pending: 'amber', none: 'neutral' };
export const KYC_LABEL: Record<string, string> = { verified: 'Verified', pending: 'Pending', none: 'Not started' };
