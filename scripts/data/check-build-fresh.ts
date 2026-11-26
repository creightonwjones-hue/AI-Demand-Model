/**
 * Fails when data/build/ on disk differs from the committed data/build/ (git HEAD), ignoring manifest.json's
 * `builtAt` timestamp. CI runs `npm run data:build` and then this script, so a commit that changes inputs
 * (config, raw data, manual files, code) without the rebuilt output is caught.
 *
 *   npx tsx scripts/data/check-build-fresh.ts
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const DIR = 'data/build';

/** Parsed JSON with volatile fields removed (manifest.json `builtAt`), or the raw text if it is not JSON. */
export function normalizeBuildFile(name: string, text: string): unknown {
  let data: unknown;
  try { data = JSON.parse(text); } catch { return text; }
  if (name === 'manifest.json' && data && typeof data === 'object' && !Array.isArray(data)) {
    const { builtAt: _ignored, ...rest } = data as Record<string, unknown>;
    return rest;
  }
  return data;
}

/** Names of files that differ, or exist on only one side, between the committed and rebuilt build directories. */
export function staleBuildFiles(committed: Map<string, string>, rebuilt: Map<string, string>): string[] {
  const names = [...new Set([...committed.keys(), ...rebuilt.keys()])].sort();
  return names.filter(n => {
    const a = committed.get(n);
    const b = rebuilt.get(n);
    if (a === undefined || b === undefined) return true;
    return JSON.stringify(normalizeBuildFile(n, a)) !== JSON.stringify(normalizeBuildFile(n, b));
  });
}

function committedFiles(): Map<string, string> {
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 30 });
  const names = git('ls-tree', '--name-only', 'HEAD', `${DIR}/`).split('\n').filter(Boolean);
  return new Map(names.map(p => [p.slice(DIR.length + 1), git('show', `HEAD:${p}`)]));
}

function rebuiltFiles(): Map<string, string> {
  return new Map(readdirSync(DIR).map(n => [n, readFileSync(`${DIR}/${n}`, 'utf8')]));
}

function main() {
  const stale = staleBuildFiles(committedFiles(), rebuiltFiles());
  if (stale.length) {
    console.error(`data/build is stale: ${stale.join(', ')} differ from the committed files.`);
    console.error('Run `npm run data:build` and commit data/build/.');
    process.exit(1);
  }
  console.log('data/build matches the committed files (ignoring manifest builtAt).');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
