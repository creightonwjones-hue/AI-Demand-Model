import { describe, it, expect } from 'vitest';
import { calendarQuarterFor, weeksBetween, addQuarters, quarterRange } from '../src/data/quarters';

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
});
