import { describe, it, expect } from 'vitest';
import { calendarQuarterFor, weeksBetween, addQuarters, quarterRange, addDays, instantQuarter } from '../src/data/quarters';

describe('quarters', () => {
  it('maps fiscal periods to the calendar quarter of the midpoint', () => {
    expect(calendarQuarterFor('2026-07-27', '2026-10-25')).toBe('2026Q3'); // NVIDIA Q3 FY27
    expect(calendarQuarterFor('2026-06-01', '2026-08-31')).toBe('2026Q3'); // Oracle Q1 FY27
    expect(calendarQuarterFor('2026-10-26', '2027-01-31')).toBe('2026Q4'); // NVIDIA 14-week Q4 FY27
  });
  it('rounds to whole weeks', () => {
    expect(weeksBetween('2026-10-26', '2027-01-31')).toBe(14);
    expect(weeksBetween('2026-07-27', '2026-10-25')).toBe(13);
  });
  it('adds quarters across year boundaries', () => {
    expect(addQuarters('2026Q4', 1)).toBe('2027Q1');
    expect(addQuarters('2026Q1', -1)).toBe('2025Q4');
    expect(addQuarters('2026Q2', 0)).toBe('2026Q2');
  });
  it('builds inclusive ranges', () => {
    expect(quarterRange('2026Q3', '2027Q1')).toEqual(['2026Q3', '2026Q4', '2027Q1']);
    expect(quarterRange('2026Q3', '2026Q3')).toEqual(['2026Q3']);
  });
  it('adds calendar days across month and year ends', () => {
    expect(addDays('2026-02-27', 3)).toBe('2026-03-02');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-07-26', 0)).toBe('2026-07-26');
  });
  it('maps a balance-sheet instant to the quarter of the ~3-month period ending on it', () => {
    expect(instantQuarter('2026-07-26')).toBe('2026Q2'); // NVIDIA Q2 FY27 balance sheet
    expect(instantQuarter('2026-01-25')).toBe('2025Q4'); // NVIDIA FY26 year end
    expect(instantQuarter('2026-09-30')).toBe('2026Q3');
    expect(instantQuarter('2026-05-31')).toBe('2026Q2'); // Oracle FY26 year end
  });
});
