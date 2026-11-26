import type { VerificationStatus } from '../data/schema';

const MINUS = '−';

const UNITS: Array<[number, string]> = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** Compact dollar amount: `$115.8B`, `$950M`, `−$2.1B`. One decimal for T and B, and for M below 100. */
export function formatUsd(value: number): string {
  const sign = value < 0 ? MINUS : '';
  const abs = Math.abs(value);
  if (abs === 0) return '$0';
  for (let i = 0; i < UNITS.length; i++) {
    const [size, suffix] = UNITS[i];
    if (abs < size) continue;
    const scaled = abs / size;
    const decimals = suffix === 'T' || suffix === 'B' || scaled < 100 ? (suffix === 'K' ? 0 : 1) : 0;
    const text = scaled.toFixed(decimals);
    if (Number(text) >= 1000 && i > 0) {
      // rounding reached the next unit (e.g. 999.96M → 1000M): restate as 1.0 of the larger unit
      return `${sign}$${(abs / UNITS[i - 1][0]).toFixed(1)}${UNITS[i - 1][1]}`;
    }
    return `${sign}$${text}${suffix}`;
  }
  return `${sign}$${abs.toFixed(2)}`;
}

export type BadgeTone = 'good' | 'neutral' | 'warn';

export function statusBadge(s: VerificationStatus): { label: string; tone: BadgeTone } {
  switch (s) {
    case 'primary-filing': return { label: 'Filing', tone: 'good' };
    case 'primary-company': return { label: 'Company', tone: 'good' };
    case 'secondary': return { label: 'Secondary', tone: 'neutral' };
    case 'unverified': return { label: 'Unverified', tone: 'warn' };
  }
}

/** Rank used to pick the strongest or weakest of several statuses (higher = better verified). */
export const STATUS_RANK: Record<VerificationStatus, number> = {
  'primary-filing': 3, 'primary-company': 2, secondary: 1, unverified: 0,
};

function num(value: number, maxDecimals: number): string {
  const s = Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
  return (value < 0 ? MINUS : '') + s;
}

function fixed(value: number, decimals: number): string {
  return (value < 0 ? MINUS : '') + Math.abs(value).toFixed(decimals);
}

/** A series value formatted for its unit (units as written in data/build/series.json). */
export function formatSeriesValue(value: number, unit: string): string {
  switch (unit) {
    case '%': return `${fixed(value, 2)}%`;
    case '% y/y': return `${num(value, 1)}% y/y`;
    case '% change y/y': return `${num(value, 1)}% y/y`;
    case '% of launch price': return `${num(value, 1)}% of launch`;
    case 'bp': return `${num(value, 0)} bp`;
    case 'USD': return formatUsd(value);
    case 'USD/share': return (value < 0 ? MINUS : '') + `$${Math.abs(value).toFixed(2)}`;
    case 'USD per GPU-hour': return (value < 0 ? MINUS : '') + `$${Math.abs(value).toFixed(2)}/GPU-h`;
    case 'USD per GPU': return (value < 0 ? MINUS : '') + `$${num(Math.abs(value), 0)}`;
    case 'index': return num(value, 1);
    case 'analysts': return `${num(value, 0)} analysts`;
    default: return `${num(value, 2)} ${unit}`;
  }
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
