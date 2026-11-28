/**
 * First calibration: grid search over a few behavioural params against the rolling backtest, then writes the best
 * values into config/engine-params.json with a "calibrated" source label.
 *
 *   npm run engine:calibrate
 */
import { loadBuild } from '../../src/engine/node-io';
import { calibrate } from '../../src/engine/calibrate';
import { loadParams } from '../../src/engine/node-io';
import { writeJson } from './json';

const PATH = 'config/engine-params.json';
export const CALIBRATION_GRID: Record<string, number[]> = {
  overExtrapolation: [1.0, 1.1, 1.2],
  nvidiaAspQuarterlyGrowth: [0.02, 0.035, 0.05, 0.065],
};
const LABEL = 'calibrated 2026-11-27, fit 2023Q1–2025Q4';

const params = loadParams(PATH);
const keys = Object.keys(CALIBRATION_GRID);
const t0 = Date.now();
const res = calibrate(loadBuild(), params, keys, CALIBRATION_GRID);
for (const k of keys) {
  const was = params[k];
  res.best[k] = { ...res.best[k], source: `${LABEL} (was ${was.value}; prior: ${was.source})` };
  console.log(`${k}: ${was.value} -> ${res.best[k].value}`);
}
console.log(`fit MAPE ${res.fitMape.toFixed(1)}%, holdout MAPE ${res.holdoutMape.toFixed(1)}% (${res.tried} combinations, ${((Date.now() - t0) / 1000).toFixed(0)}s)`);
writeJson(PATH, res.best);
