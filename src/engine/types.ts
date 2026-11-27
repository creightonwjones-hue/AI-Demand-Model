// Single source of truth for engine types (phases 2-7). All money is nominal USD per quarter unless a name says otherwise.
import type { QuarterKey } from '../data/schema';

/** The quarterly time axis every path and result is indexed by. */
export interface Grid {
  quarters: QuarterKey[];
  /** Position of a quarter on the grid; throws if outside it. */
  idx(q: QuarterKey): number;
}

export type ConditionId =
  | 'aiSpend' | 'tokenPrice' | 'priceElasticity' | 'creditSpread' | 'riskFree' | 'gpuResale'
  | 'gpuRental' | 'powerGw' | 'exportRegime' | 'equitySentiment' | 'physicalAiGrowth' | 'labourSubstitution';

/** One external condition over the grid, with where each value came from and an uncertainty band. */
export interface ConditionPath {
  id: ConditionId;
  unit: string;
  values: number[]; // one per grid quarter
  origin: ('history' | 'default' | 'user')[];
  low: number[];
  high: number[];
  rangeSource: string;
  /**
   * First grid quarter with real data known at asOf; undefined when the condition has no history. Quarters before it
   * are origin 'default' (they hold the first observed value) and rangeSource then says so as an Assumption.
   */
  firstHistory?: QuarterKey;
  /** Plain-language caveats: partial or spliced history, quarters filled by the model, placeholders. */
  notes?: string;
}

export type Conditions = Record<ConditionId, ConditionPath>;

/** A tunable number from config/engine-params.json. */
export interface ParamValue {
  value: number;
  unit: string;
  description: string;
  source: string;
  min?: number;
  max?: number;
}

export type EngineParams = Record<string, ParamValue>;

export type FlowKind =
  | 'customer-spend' | 'compute-rent' | 'chip-purchase' | 'memory-purchase' | 'foundry' | 'lithography'
  | 'buildings-capex' | 'equity' | 'loan-draw' | 'interest' | 'principal' | 'guarantee-payment' | 'operating-cost'
  | 'core-business-cash'; // a hyperscaler's non-AI operating cash flow (net of non-AI capex), from the rest of the economy

/** Money moving between two entities in one quarter. */
export interface Flow {
  quarter: QuarterKey;
  from: string;
  to: string;
  amountUsd: number;
  kind: FlowKind;
  dealId?: string;
  label: string; // short line title for the canvas, e.g. "Buys GPUs"
}

/** Minsky financing stance: hedge (cash covers debt service), speculative (covers interest only), ponzi (neither). */
export type Minsky = 'hedge' | 'speculative' | 'ponzi';

export interface EntityQuarter {
  quarter: QuarterKey;
  revenue: number;
  operatingCost: number;
  capex: number;
  operatingCashFlow: number;
  netIncome: number;
  cash: number;
  debt: number;
  equityRaised: number;
  minsky: Minsky;
  defaulted: boolean;
  modelled: boolean; // false when the value is the actual (history)
}

export interface NvidiaQuarter {
  quarter: QuarterKey;
  revenue: number;
  dataCenter: number;
  hyperscale: number;
  aiCloudsEnterprise: number;
  edge: number;
  physicalAi: number;
  grossMargin: number;
  netIncome: number;
  eps: number;
  unitsShipped: number;
  supplyShortfallUnits: number;
  customerFinancedShare: number;
}

export interface EngineEvent {
  quarter: QuarterKey;
  entityId: string;
  kind: 'default' | 'minsky-change' | 'supply-bound' | 'contract-missed' | 'equity-raise' | 'loan-draw';
  reason: string; // one plain-language line
}

export interface RunResult {
  grid: Grid;
  flows: Flow[];
  entities: Record<string, EntityQuarter[]>;
  nvidia: NvidiaQuarter[];
  events: EngineEvent[];
  invariantErrors: string[];
  asOf: string;
  start: QuarterKey;
}
