import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { EntitySchema, type Entity } from './schema';

/** Read and validate the entity registry; ids must be unique. */
export function loadEntities(path = 'config/entities.json'): Entity[] {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const entities = z.array(EntitySchema).parse(raw);
  const seen = new Set<string>();
  for (const e of entities) {
    if (seen.has(e.id)) throw new Error(`duplicate entity id: ${e.id}`);
    seen.add(e.id);
  }
  return entities;
}
