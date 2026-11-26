import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import { fredToSeries } from '../../src/data/series';
import { fetchWithPolicy } from './http';

const OUT_DIR = 'data/raw/fred';

export const FredConfigSchema = z.array(z.object({
  id: z.string().regex(/^[A-Z0-9]+$/),
  name: z.string(),
  unit: z.string(),
  kind: z.enum(['condition', 'indicator', 'consensus', 'guidance']),
  lagDays: z.number().int().min(0), // publication lag: asKnownAt = observation date + lagDays
}));

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const config = FredConfigSchema.parse(JSON.parse(readFileSync('config/fred-series.json', 'utf8')));
  const retrieved = new Date().toISOString().slice(0, 10);
  const manifest: Record<string, { points: number; first: string; last: string }> = {};
  for (const s of config) {
    const res = await fetchWithPolicy(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${s.id}`);
    const body = await res.text();
    const series = fredToSeries(s.id, body, { ...s, retrieved }); // validate before writing
    if (!series.points.length) throw new Error(`FRED ${s.id}: no observations`);
    writeFileSync(`${OUT_DIR}/${s.id}.csv`, body);
    const first = series.points[0];
    const last = series.points[series.points.length - 1];
    manifest[s.id] = { points: series.points.length, first: first.date, last: last.date };
    console.log(`${s.id}: ${series.points.length} points ${first.date}..${last.date} (last ${last.value})`);
  }
  // Retrieval date for each CSV's SourceRef (the CSVs themselves carry no fetch date).
  writeFileSync(`${OUT_DIR}/manifest.json`, JSON.stringify({ retrieved, series: manifest }, null, 2) + '\n');
}

main().catch(err => { console.error(err); process.exit(1); });
