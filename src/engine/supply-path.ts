// Time paths for the two supply-side figures that are sourced at a single date: NVIDIA's average selling price per
// accelerator and the CoWoS/HBM capacity ceilings. Both are anchored at SUPPLY_ANCHOR (end-2026, where the capacity
// estimates are sourced) and move by a constant quarterly growth rate before and after it.
import type { QuarterKey } from '../data/schema';
import { param } from './params';
import type { EngineParams } from './types';

export const SUPPLY_ANCHOR: QuarterKey = '2026Q4';

/** Signed number of quarters from SUPPLY_ANCHOR to q (works outside the grid). */
function quartersFromAnchor(q: QuarterKey): number {
  const n = (k: QuarterKey) => Number(k.slice(0, 4)) * 4 + Number(k[5]) - 1;
  return n(q) - n(SUPPLY_ANCHOR);
}

/** NVIDIA average selling price per accelerator-equivalent in quarter q. */
export function aspAt(p: EngineParams, q: QuarterKey): number {
  return param(p, 'nvidiaAspUsd') * (1 + param(p, 'nvidiaAspQuarterlyGrowth')) ** quartersFromAnchor(q);
}

/** Multiplier on the end-2026 CoWoS and HBM capacity ceilings in quarter q. */
export function capacityFactorAt(p: EngineParams, q: QuarterKey): number {
  return (1 + param(p, 'supplyCapacityQuarterlyGrowth')) ** quartersFromAnchor(q);
}
