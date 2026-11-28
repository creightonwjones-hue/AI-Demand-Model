import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { DealSchema, type Deal, type Entity } from './schema';
import { loadEntities } from './load-entities';

/**
 * Loads the deal database, validates every record against DealSchema, checks that every
 * party id (payers, payees, guarantors, vehicle) exists in the entity registry and that deal
 * ids are unique. Errors name the offending deal.
 */
export function loadDeals(path = 'data/deals/deals.json', entities: Entity[] = loadEntities()): Deal[] {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const rows = z.array(z.unknown()).parse(raw);
  const known = new Set(entities.map(e => e.id));
  const seen = new Set<string>();
  const deals: Deal[] = [];
  rows.forEach((row, i) => {
    const label = typeof row === 'object' && row !== null && typeof (row as { id?: unknown }).id === 'string'
      ? (row as { id: string }).id : `#${i}`;
    const parsed = DealSchema.safeParse(row);
    if (!parsed.success) {
      const issues = parsed.error.issues.map(x => `${x.path.join('.') || '(root)'}: ${x.message}`).join('; ');
      throw new Error(`deal ${label}: invalid record: ${issues}`);
    }
    const d = parsed.data;
    if (seen.has(d.id)) throw new Error(`duplicate deal id: ${d.id}`);
    seen.add(d.id);
    const roles: [string, string[]][] = [
      ['payers', d.payers], ['payees', d.payees], ['guarantors', d.guarantors],
      ['vehicle', d.vehicle === undefined ? [] : [d.vehicle]],
    ];
    for (const [role, ids] of roles)
      for (const id of ids)
        if (!known.has(id)) throw new Error(`deal ${d.id}: unknown entity '${id}' in ${role}`);
    deals.push(d);
  });
  return deals;
}

/** Sums exactly one value field across deals; deals without that field are skipped. Never mixes fields. */
export function sumValues(deals: Deal[], field: keyof Deal['values']): number {
  let total = 0;
  for (const d of deals) {
    const v = d.values[field];
    if (v !== undefined) total += v;
  }
  return total;
}

/** Deals in which the entity is a payer, payee, guarantor or the vehicle. */
export function dealsTouching(deals: Deal[], entityId: string): Deal[] {
  return deals.filter(d => d.payers.includes(entityId) || d.payees.includes(entityId)
    || d.guarantors.includes(entityId) || d.vehicle === entityId);
}
