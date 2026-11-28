import { mkdirSync, writeFileSync } from 'node:fs';
import { loadEntities } from '../../src/data/load-entities';
import { fetchWithPolicy } from './http';

const OUT_DIR = 'data/raw/sec';

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const targets = loadEntities().filter(e => e.xbrl);
  for (const e of targets) {
    if (!e.cik || !e.ticker) throw new Error(`entity ${e.id} is xbrl but lacks cik/ticker`);
    const res = await fetchWithPolicy(`https://data.sec.gov/api/xbrl/companyfacts/CIK${e.cik}.json`);
    const body = await res.text();
    JSON.parse(body); // validate
    const file = `${OUT_DIR}/${e.ticker}_companyfacts.json`;
    writeFileSync(file, body);
    console.log(`${file}: ${Buffer.byteLength(body)} bytes`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
