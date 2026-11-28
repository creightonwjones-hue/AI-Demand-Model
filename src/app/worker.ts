// Engine worker: builds the data-default conditions once, then runs one path per request with the user's overrides.
import bundle from 'virtual:engine-input';
import { asOfView } from '../engine/asof';
import { buildConditions, withUserPath } from '../engine/conditions';
import { makeGrid } from '../engine/grid';
import { runOnePath } from '../engine/run';
import type { ConditionId, Conditions } from '../engine/types';
import type { RunReply, RunRequest } from './run-client';

const grid = makeGrid();
const base = buildConditions(asOfView(bundle.build, bundle.asOf), grid, bundle.asOf, { specs: bundle.specs, params: bundle.params });

export function runRequest(req: RunRequest): RunReply {
  let conditions: Conditions = base;
  for (const [id, values] of Object.entries(req.overrides)) conditions = withUserPath(conditions, id as ConditionId, values!, grid);
  const run = runOnePath({ build: bundle.build, params: bundle.params, asOf: bundle.asOf, start: bundle.start, conditions });
  return { id: req.id, run, conditions };
}

// The grid carries a function (idx), which cannot cross to the page; the page rebuilds it (run-client.ts).
self.onmessage = (e: MessageEvent<RunRequest>) => {
  const reply = runRequest(e.data);
  self.postMessage({ ...reply, run: { ...reply.run, grid: undefined } });
};
