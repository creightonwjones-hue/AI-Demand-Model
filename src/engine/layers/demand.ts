// Demand layer (spec §8.2): end-customer AI spend → segments → labs, with price elasticity, export policy,
// a labour-substitution ceiling and deterministic lab-share drift. Mutates s.market.labShares.
import type { EngineState } from '../init';
import { param } from '../params';
import type { Conditions, EngineParams, Flow } from '../types';

export type Segment = 'consumer' | 'enterprise' | 'sovereign' | 'china' | 'physicalAi';

export interface DemandOut {
  spendBySegment: Record<Segment, number>;
  labRevenue: Record<string, number>;
  computeNeedUsd: Record<string, number>; // per lab
  physicalAiSpend: number;
  ceilingBound: boolean;
  flows: Flow[];
}

/** Entity that pays for each segment's spend. */
export const SEGMENT_PAYER: Record<Segment, string> = {
  consumer: 'ai-customers-consumer',
  enterprise: 'ai-customers-enterprise',
  sovereign: 'sovereign-international',
  china: 'china-market',
  physicalAi: 'physical-ai-buyers',
};
const PHYSICAL_AI_SELLER = 'nvidia';
const QUARTERS_PER_YEAR = 4;
const LAB_LABEL = 'Subscriptions & API';
const PHYSICAL_LABEL = 'Physical AI chips';

/** Move every lab's share a fraction `drift` toward the current leader taking it all (deterministic in phase 2). */
function driftShares(shares: Record<string, number>, drift: number): void {
  const labs = Object.keys(shares);
  if (labs.length === 0) return;
  const leader = labs.reduce((a, b) => (shares[b] > shares[a] ? b : a));
  for (const lab of labs) shares[lab] = (1 - drift) * shares[lab] + (lab === leader ? drift : 0);
}

export function stepDemand(s: EngineState, c: Conditions, p: EngineParams): DemandOut {
  const qi = s.q;
  const quarter = s.grid.quarters[qi];
  const at = (id: keyof Conditions) => c[id].values[qi];

  const eps = at('priceElasticity');
  const priceFactor = Math.pow(at('tokenPrice') / param(p, 'tokenPriceBase'), 1 - eps);
  const quarterly = (at('aiSpend') / QUARTERS_PER_YEAR) * priceFactor;

  const raw: Record<Segment, number> = {
    consumer: quarterly * param(p, 'segmentShareConsumer'),
    enterprise: quarterly * param(p, 'segmentShareEnterprise'),
    sovereign: quarterly * param(p, 'segmentShareSovereign'),
    china: quarterly * param(p, 'segmentShareChina') * at('exportRegime'),
    physicalAi: quarterly * param(p, 'segmentSharePhysicalAi') * at('physicalAiGrowth'),
  };
  // Shares are normalised so they always sum to one (they are separate calibrated params).
  const shareSum = ['Consumer', 'Enterprise', 'Sovereign', 'China', 'PhysicalAi']
    .reduce((a, k) => a + param(p, `segmentShare${k}`), 0);
  for (const k of Object.keys(raw) as Segment[]) raw[k] /= shareSum;

  const ceiling = (at('labourSubstitution') * param(p, 'aiAddressableWageBillUsd')) / QUARTERS_PER_YEAR;
  const uncapped = Object.values(raw).reduce((a, b) => a + b, 0);
  const ceilingBound = uncapped > ceiling;
  const scale = ceilingBound ? ceiling / uncapped : 1;
  const spendBySegment = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, v * scale])) as Record<Segment, number>;

  driftShares(s.market.labShares, param(p, 'labShareDrift'));

  const labRevenue: Record<string, number> = {};
  const computeNeedUsd: Record<string, number> = {};
  const flows: Flow[] = [];
  const costShare = param(p, 'computeCostShare');
  for (const [lab, share] of Object.entries(s.market.labShares)) {
    labRevenue[lab] = 0;
    for (const seg of ['consumer', 'enterprise', 'sovereign', 'china'] as const) {
      const amount = spendBySegment[seg] * share;
      if (amount <= 0) continue;
      labRevenue[lab] += amount;
      flows.push({ quarter, from: SEGMENT_PAYER[seg], to: lab, amountUsd: amount, kind: 'customer-spend', label: LAB_LABEL });
    }
    computeNeedUsd[lab] = labRevenue[lab] * costShare;
  }
  const physicalAiSpend = spendBySegment.physicalAi;
  if (physicalAiSpend > 0)
    flows.push({ quarter, from: SEGMENT_PAYER.physicalAi, to: PHYSICAL_AI_SELLER, amountUsd: physicalAiSpend, kind: 'customer-spend', label: PHYSICAL_LABEL });

  return { spendBySegment, labRevenue, computeNeedUsd, physicalAiSpend, ceilingBound, flows };
}
