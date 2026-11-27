/**
 * Baseline engine outputs for the site: data/build/engine-baseline.json (one path from the latest build date) and
 * data/build/backtest.json (rolling backtest plus fit/holdout error). Deterministic, so CI can check freshness.
 *
 *   npm run engine:baseline
 */
import { asOfView, loadBuild } from '../../src/engine/asof';
import { latestBuildDate, rollingBacktest } from '../../src/engine/backtest';
import { ALL_ORIGINS, fitRows, holdoutRows, objective } from '../../src/engine/calibrate';
import { makeGrid } from '../../src/engine/grid';
import { loadParams, param } from '../../src/engine/params';
import type { BaselineComparisons, EngineBaseline } from '../../src/engine/types';
import { runOnePath } from '../../src/engine/run';
import { writeJson } from './json';

const build = loadBuild();
const params = loadParams();
const grid = makeGrid();
const asOf = latestBuildDate(build);
const view = asOfView(build, asOf);
const start = grid.quarters.find(q => !view.fact('nvidia', 'revenue', q) && grid.quarters.slice(0, grid.idx(q)).some(p => view.fact('nvidia', 'revenue', p)))!;

const run = runOnePath({ build, params, asOf, start });
const report = rollingBacktest(build, params, ALL_ORIGINS);
const fitMape = objective(fitRows(report.rows));
const holdoutMape = objective(holdoutRows(report.rows));
const overfitWarning = holdoutMape > 2 * fitMape;

const latestValue = (id: string) => view.series(id).at(-1)?.value;
const mid = (id: string) => latestValue(id) ?? (((latestValue(`${id}-low`) ?? NaN) + (latestValue(`${id}-high`) ?? NaN)) / 2);
const comparisons: BaselineComparisons = {
  nvidiaRevenueConsensus: [2027, 2028, 2029].flatMap(fy => {
    const usd = latestValue(`consensus-nvda-rev-fy${fy}-yahoo-avg`);
    return usd === undefined ? [] : [{ fy, usd }];
  }),
  capexGuidance: [2026, 2027].flatMap(year => {
    const usd = ['microsoft', 'alphabet', 'amazon', 'meta'].reduce((t, c) => t + mid(`guidance-capex-${c}-cy${year}`), 0);
    return Number.isFinite(usd) ? [{ year, usd }] : [];
  }),
  aiCapexShare: param(params, 'hyperscalerAiCapexShare'),
};
const baseline: EngineBaseline = { ...run, overfitWarning, comparisons };
writeJson('data/build/engine-baseline.json', baseline);
writeJson('data/build/backtest.json', { ...report, calibration: { fitMape, holdoutMape, overfitWarning } });
console.log(`baseline asOf ${asOf} start ${start}; fit ${fitMape.toFixed(1)}% holdout ${holdoutMape.toFixed(1)}%${overfitWarning ? ' (overfit warning)' : ''}`);
