import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import { FinancialFactSchema, SeriesSchema, type FinancialFact, type Series, type Entity } from '../../src/data/schema';
import { loadEntities } from '../../src/data/load-entities';
import { extractQuarterly, loadMetricMap } from '../../src/data/xbrl';
import { fredToSeries, loadManualSeries } from '../../src/data/series';
import { buildFxTable, loadManualFinancials } from '../../src/data/manual-financials';
import { loadDeals } from '../../src/data/deals';
import { coverageReport } from '../../src/data/coverage';
import { quarterRange } from '../../src/data/quarters';

const FROM = '2022Q1';
const OUT = 'data/build';

const FredConfigSchema = z.array(z.object({
  id: z.string(), name: z.string(), unit: z.string(), kind: z.enum(['condition', 'indicator', 'consensus', 'guidance']),
  lagDays: z.number(),
}));
const FredManifestSchema = z.object({ retrieved: z.string(), series: z.record(z.string(), z.unknown()) }).passthrough();

const readText = (p: string): string => {
  if (!existsSync(p)) throw new Error(`${p}: file not found`);
  return readFileSync(p, 'utf8');
};
const writeJson = (name: string, data: unknown) => writeFileSync(`${OUT}/${name}`, JSON.stringify(data) + '\n');

/** Runs a build step; any failure is re-thrown naming the file being built. */
function step<T>(file: string, fn: () => T): T {
  try { return fn(); } catch (e) { throw new Error(`${file}: ${(e as Error).message}`); }
}

function main() {
  const entities = step('config/entities.json', () => loadEntities());
  const metricMap = step('config/sec-metrics.json', () => loadMetricMap());

  // FRED
  const fredCfg = step('config/fred-series.json', () => FredConfigSchema.parse(JSON.parse(readText('config/fred-series.json'))));
  const manifest = step('data/raw/fred/manifest.json', () => FredManifestSchema.parse(JSON.parse(readText('data/raw/fred/manifest.json'))));
  const fred: Series[] = fredCfg.map(c => step(`data/raw/fred/${c.id}.csv`, () => {
    if (!(c.id in manifest.series)) throw new Error(`series ${c.id} missing from data/raw/fred/manifest.json (no retrieval date)`);
    return fredToSeries(c.id, readText(`data/raw/fred/${c.id}.csv`),
      { name: c.name, unit: c.unit, kind: c.kind, lagDays: c.lagDays, retrieved: manifest.retrieved });
  }));
  const fredById = new Map(fred.map(s => [s.id, s]));
  const fx = step('data/manual/financials.csv', () => {
    const get = (id: string) => { const s = fredById.get(id); if (!s) throw new Error(`FX series ${id} not in config/fred-series.json`); return s; };
    return buildFxTable(get('DEXTAUS'), get('DEXKOUS'), get('DEXUSEU'));
  });

  // Facts: SEC XBRL + manual
  const facts: FinancialFact[] = [];
  for (const e of entities.filter(x => x.xbrl)) {
    const file = `data/raw/sec/${e.ticker}_companyfacts.json`;
    facts.push(...step(file, () => extractQuarterly(JSON.parse(readText(file)), e, metricMap)));
  }
  facts.push(...step('data/manual/financials.csv', () => loadManualFinancials(readText('data/manual/financials.csv'), entities, fx)));
  step('financials (all facts)', () => z.array(FinancialFactSchema).parse(facts));
  const known = new Set(entities.map(e => e.id));
  for (const f of facts) if (!known.has(f.entityId)) throw new Error(`financials: fact for unknown entity ${f.entityId}`);

  const latest = facts.reduce((q, f) => (f.quarter > q ? f.quarter : q), FROM);
  const window = new Set(quarterRange(FROM, latest));
  const inWindow = facts.filter(f => window.has(f.quarter)).sort((a, b) =>
    a.entityId.localeCompare(b.entityId) || a.metric.localeCompare(b.metric) || (a.segment ?? '').localeCompare(b.segment ?? '')
    || a.quarter.localeCompare(b.quarter) || a.asKnownAt.localeCompare(b.asKnownAt));

  // Series: FRED + manual
  const manual = step('data/manual/series.csv', () => loadManualSeries(readText('data/manual/series.csv')));
  const series = [...fred, ...manual];
  const ids = new Set<string>();
  for (const s of series) {
    if (ids.has(s.id)) throw new Error(`data/manual/series.csv: series id ${s.id} duplicates a FRED series`);
    ids.add(s.id);
    step(`series ${s.id}`, () => SeriesSchema.parse(s));
  }

  const deals = step('data/deals/deals.json', () => loadDeals('data/deals/deals.json', entities));
  const reporting = new Set(inWindow.map(f => f.entityId));
  const coverage = coverageReport(entities.filter(e => e.xbrl || reporting.has(e.id)), inWindow, FROM, latest);

  const unverified = (fs: FinancialFact[]) => fs.filter(f => f.source.status === 'unverified').length;
  const manifestOut = {
    builtAt: new Date().toISOString(),
    counts: {
      entities: entities.length, facts: inWindow.length, factsAllQuarters: facts.length, series: series.length,
      seriesPoints: series.reduce((n, s) => n + s.points.length, 0), deals: deals.length, coverageRows: coverage.length,
    },
    unverifiedCounts: {
      facts: unverified(inWindow), deals: deals.reduce((n, d) => n + d.sources.filter(s => s.status === "unverified").length, 0),
      seriesPoints: manual.reduce((n, s) => n + s.points.filter(p => p.source?.status === 'unverified').length, 0),
    },
    window: { from: FROM, to: latest },
    zeroValueFacts: inWindow.filter(f => f.value === 0)
      .map(f => ({ entityId: f.entityId, metric: f.metric, quarter: f.quarter, asKnownAt: f.asKnownAt })),
  };

  mkdirSync(OUT, { recursive: true });
  writeJson('entities.json', entities);
  writeJson('financials.json', inWindow);
  writeJson('series.json', series);
  writeJson('deals.json', deals);
  writeJson('coverage.json', coverage);
  writeJson('manifest.json', manifestOut);

  printTable(entities, inWindow, coverage, latest, manifestOut);
  console.log(`\nZero-valued facts (reported, not failed): ${manifestOut.zeroValueFacts.length}`);
  for (const z of manifestOut.zeroValueFacts) console.log(`  ${z.entityId} ${z.metric} ${z.quarter} asKnownAt ${z.asKnownAt}`);
}

function printTable(entities: Entity[], facts: FinancialFact[], coverage: ReturnType<typeof coverageReport>, latest: string,
  m: { counts: Record<string, number>; unverifiedCounts: Record<string, number> }) {
  console.log(`Build window ${FROM}..${latest}`);
  console.log('Counts:', JSON.stringify(m.counts));
  console.log('Unverified:', JSON.stringify(m.unverifiedCounts));
  console.log('\nentity            facts  metrics-with-data  gaps  unverified');
  for (const e of entities) {
    const rows = coverage.filter(r => r.entityId === e.id);
    const n = facts.filter(f => f.entityId === e.id).length;
    if (!n && !rows.some(r => r.firstQuarter)) continue;
    const withData = rows.filter(r => r.firstQuarter).length;
    const gaps = rows.reduce((s, r) => s + r.gaps.length, 0);
    const unv = rows.reduce((s, r) => s + r.unverifiedCount, 0);
    console.log(`${e.id.padEnd(16)} ${String(n).padStart(6)} ${String(withData).padStart(10)} ${String(gaps).padStart(10)} ${String(unv).padStart(8)}`);
  }
}

try { main(); } catch (e) {
  console.error(`data:build failed: ${(e as Error).message}`); if (process.env.DEBUG) console.error((e as Error).stack);
  process.exit(1);
}
