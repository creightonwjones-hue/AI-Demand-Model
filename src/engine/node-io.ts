// The engine's only file reads (Node: tests, scripts, the Vite build). Everything else in src/engine is browser-safe.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseBuild, type BuildData } from './asof';
import { parseConditionSpecs, registerConditionDefaults, type ConditionSpecs } from './conditions';
import { parseParams } from './params';
import type { EngineParams } from './types';

function readJson(path: string, label = path.split('/').pop()!): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8')); }
  catch (e) { throw new Error(`${label}: cannot read/parse ${path}: ${(e as Error).message}`); }
}

export function loadBuild(dir = 'data/build'): BuildData {
  return parseBuild(file => readJson(join(dir, `${file}.json`)));
}

export function loadParams(path = 'config/engine-params.json'): EngineParams {
  return parseParams(readJson(path), path);
}

export function loadConditionSpecs(path = 'config/conditions.json'): ConditionSpecs {
  return parseConditionSpecs(readJson(path), path);
}

let specs: ConditionSpecs | undefined;
let params: EngineParams | undefined;
registerConditionDefaults(() => (specs ??= loadConditionSpecs()), () => (params ??= loadParams()));
