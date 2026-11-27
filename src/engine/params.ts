import { readFileSync } from 'node:fs';
import { z } from 'zod';
import type { EngineParams } from './types';

const ParamValueSchema = z.object({
  value: z.number().finite(),
  unit: z.string().min(1),
  description: z.string().min(20),
  source: z.string().min(1),
  min: z.number().optional(),
  max: z.number().optional(),
});

const ParamsSchema = z.record(z.string(), ParamValueSchema).superRefine((params, ctx) => {
  for (const [key, p] of Object.entries(params)) {
    if ((p.min !== undefined && p.value < p.min) || (p.max !== undefined && p.value > p.max)) {
      ctx.addIssue({
        code: 'custom',
        message: `${key}: value ${p.value} is outside [${p.min ?? '-inf'}, ${p.max ?? 'inf'}]`,
      });
    }
  }
});

/** Load and validate the engine parameter file. */
export function loadParams(path = 'config/engine-params.json'): EngineParams {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const parsed = ParamsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid engine params in ${path}: ${parsed.error.issues.map((i) => i.message || i.path.join('.')).join('; ')}`);
  }
  return parsed.data;
}

/** Numeric value of a parameter; throws on an unknown key. */
export function param(p: EngineParams, key: string): number {
  // Own keys only: inherited names such as 'constructor' are not params.
  if (!Object.hasOwn(p, key)) throw new Error(`unknown param: ${key}`);
  return p[key].value;
}
