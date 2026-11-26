import { parseCsv } from './csv';
import { SeriesSchema, SourceRefSchema, type Series, type SeriesPoint, type SourceRef } from './schema';

const SERIES_COLUMNS = ['series_id', 'name', 'unit', 'provider', 'kind', 'date', 'value', 'as_known_at',
  'source_url', 'source_title', 'retrieved', 'status'] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const NUMBER = /^-?\d+(\.\d+)?$/;

export function parseNumber(raw: string | undefined, what: string): number {
  const s = (raw ?? '').trim();
  if (!NUMBER.test(s)) throw new Error(`${what}: invalid value "${raw ?? ''}" (expected a plain number)`);
  return Number(s);
}

function isoDate(raw: string | undefined, what: string): string {
  const s = (raw ?? '').trim();
  if (!ISO_DATE.test(s)) throw new Error(`${what}: invalid date "${raw ?? ''}" (expected YYYY-MM-DD)`);
  return s;
}

/**
 * Manual series rows (data/manual/series.csv) -> one Series per `series_id`, points sorted by date.
 * Each point carries its own source (url, title, retrieved, status) and asKnownAt. The series-level `source` is the
 * source of the latest point. Throws if a series mixes providers or other metadata, has duplicate dates, or a
 * row has a bad number, date or status.
 */
export function buildSeries(rows: Record<string, string>[]): Series[] {
  type Acc = { meta: Omit<Series, 'points' | 'source'>; points: Array<Required<Pick<SeriesPoint, 'date' | 'value' |
    'asKnownAt'>> & { source: SourceRef }> };
  const byId = new Map<string, Acc>();
  rows.forEach((r, idx) => {
    const where = `series row ${idx + 2} (${r.series_id ?? '?'})`;
    for (const c of SERIES_COLUMNS) if (r[c] === undefined) throw new Error(`${where}: missing column ${c}`);
    const id = r.series_id.trim();
    if (!id) throw new Error(`${where}: empty series_id`);
    const provider = r.provider.trim();
    if (!provider) throw new Error(`${where}: empty provider`);
    const meta = { id, name: r.name.trim(), unit: r.unit.trim(), provider, kind: r.kind.trim() as Series['kind'] };
    const date = isoDate(r.date, where);
    const point = {
      date,
      value: parseNumber(r.value, where),
      asKnownAt: isoDate(r.as_known_at, where),
      source: SourceRefSchema.parse({
        url: r.source_url.trim(),
        title: r.source_title.trim() || undefined,
        retrieved: isoDate(r.retrieved, where),
        status: r.status.trim(),
      }),
    };
    const acc = byId.get(id);
    if (!acc) { byId.set(id, { meta, points: [point] }); return; }
    if (acc.meta.provider !== provider) {
      throw new Error(`series ${id} mixes providers: "${acc.meta.provider}" and "${provider}"`);
    }
    for (const k of ['name', 'unit', 'kind'] as const) {
      if (acc.meta[k] !== meta[k]) throw new Error(`series ${id} has inconsistent ${k}: "${acc.meta[k]}" vs "${meta[k]}"`);
    }
    if (acc.points.some(p => p.date === date)) throw new Error(`series ${id} has a duplicate point on ${date}`);
    acc.points.push(point);
  });

  return [...byId.values()].map(({ meta, points }) => {
    points.sort((a, b) => a.date.localeCompare(b.date));
    const latest = points[points.length - 1];
    return SeriesSchema.parse({ ...meta, source: latest.source, points });
  }).sort((a, b) => a.id.localeCompare(b.id));
}

/** Convenience: parse and build data/manual/series.csv text. */
export function loadManualSeries(csvText: string): Series[] {
  return buildSeries(parseCsv(csvText));
}

/**
 * FRED graph CSV (`observation_date,<ID>`; older files use `DATE,<ID>`) -> Series. Missing values (".") and empty
 * cells are skipped, never filled.
 */
export function fredToSeries(
  id: string, csvText: string, meta: { name: string; unit: string; kind: Series['kind']; retrieved?: string },
): Series {
  const rows = parseCsv(csvText);
  const points: SeriesPoint[] = [];
  for (const r of rows) {
    if (!(id in r)) throw new Error(`FRED CSV has no column for ${id}`);
    const date = r.observation_date ?? r.DATE;
    const raw = (r[id] ?? '').trim();
    if (raw === '.' || raw === '') continue;
    points.push({ date: isoDate(date, `FRED ${id}`), value: parseNumber(raw, `FRED ${id} ${date}`) });
  }
  if (!rows.length) {
    const header = csvText.split(/\r?\n/, 1)[0] ?? '';
    if (!header.split(',').includes(id)) throw new Error(`FRED CSV has no column for ${id}`);
  }
  points.sort((a, b) => a.date.localeCompare(b.date));
  const retrieved = meta.retrieved ?? new Date().toISOString().slice(0, 10); // pass the fetch date when known
  return SeriesSchema.parse({
    id, name: meta.name, unit: meta.unit, provider: 'FRED', kind: meta.kind,
    source: { url: `https://fred.stlouisfed.org/series/${id}`, title: `FRED ${id}`, retrieved, status: 'secondary' },
    points,
  });
}
