import { describe, it, expect } from 'vitest';
import { formatUsd, statusBadge, formatSeriesValue, escapeHtml } from '../src/explorer/format';

describe('formatUsd', () => {
  it('formats the brief examples', () => {
    expect(formatUsd(115_844_000_000)).toBe('$115.8B');
    expect(formatUsd(950_000_000)).toBe('$950M');
    expect(formatUsd(-2_100_000_000)).toBe('−$2.1B');
  });
  it('uses T for trillions and one decimal below $100M', () => {
    expect(formatUsd(1_400_000_000_000)).toBe('$1.4T');
    expect(formatUsd(12_500_000)).toBe('$12.5M');
    expect(formatUsd(2_000_000_000)).toBe('$2.0B');
  });
  it('promotes to the next unit when rounding reaches 1000', () => {
    expect(formatUsd(999_960_000)).toBe('$1.0B');
    expect(formatUsd(999_960_000_000)).toBe('$1.0T');
  });
  it('handles small values and zero', () => {
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(45_000)).toBe('$45K');
    expect(formatUsd(2.35)).toBe('$2.35');
  });
});

describe('statusBadge', () => {
  it('maps every verification status', () => {
    expect(statusBadge('primary-filing')).toEqual({ label: 'Filing', tone: 'good' });
    expect(statusBadge('primary-company')).toEqual({ label: 'Company', tone: 'good' });
    expect(statusBadge('secondary')).toEqual({ label: 'Secondary', tone: 'neutral' });
    expect(statusBadge('unverified')).toEqual({ label: 'Unverified', tone: 'warn' });
  });
});

describe('formatSeriesValue', () => {
  it('formats by unit', () => {
    expect(formatSeriesValue(4.06, '%')).toBe('4.06%');
    expect(formatSeriesValue(245, 'bp')).toBe('245 bp');
    expect(formatSeriesValue(500_000_000_000, 'USD')).toBe('$500.0B');
    expect(formatSeriesValue(2.1, 'USD per GPU-hour')).toBe('$2.10/GPU-h');
    expect(formatSeriesValue(6.5, 'USD/share')).toBe('$6.50');
    expect(formatSeriesValue(6012.4, 'index')).toBe('6,012.4');
    expect(formatSeriesValue(-35, '% change y/y')).toBe('−35% y/y');
  });
});

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml(`<a href="x">Tom's & co</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom&#39;s &amp; co&lt;/a&gt;');
  });
});
