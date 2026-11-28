import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { prepare } from './src/explorer/prepare';
import { makeBundle, metaOf } from './src/engine/browser-input';
import { loadBuild, loadConditionSpecs, loadParams } from './src/engine/node-io';

const VIRTUAL_ID = 'virtual:explorer-data';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const FILES = ['entities', 'financials', 'series', 'deals', 'coverage', 'manifest'] as const;
/** Engine outputs: optional, so the page still builds before the first engine run. */
const OPTIONAL = ['engine-baseline', 'backtest'] as const;

/**
 * Serves `virtual:explorer-data`: the committed data/build/*.json reduced at build time to what the page shows
 * (latest vintage per quarter, month-end series points), so the ~8 MB of raw JSON never reaches the bundle.
 */
function explorerData(): Plugin {
  const path = (f: string) => fileURLToPath(new URL(`./data/build/${f}.json`, import.meta.url));
  return {
    name: 'explorer-data',
    resolveId: id => (id === VIRTUAL_ID ? RESOLVED_ID : undefined),
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const raw = Object.fromEntries(FILES.map(f => {
        this.addWatchFile(path(f));
        return [f, JSON.parse(readFileSync(path(f), 'utf8'))];
      }));
      for (const f of OPTIONAL) {
        if (!existsSync(path(f))) continue;
        this.addWatchFile(path(f));
        raw[f] = JSON.parse(readFileSync(path(f), 'utf8'));
      }
      const data = prepare(raw as Parameters<typeof prepare>[0]);
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(data))});`;
    },
  };
}

const ENGINE_ID = 'virtual:engine-input';
const META_ID = 'virtual:engine-meta';

/**
 * Serves `virtual:engine-input` (worker: trimmed build, params, condition specs, baseline comparisons) and
 * `virtual:engine-meta` (page: asOf, start, comparisons, entities, deals), so the large data ships only once.
 */
function engineInput(): Plugin {
  const bundle = () => makeBundle(loadBuild(), loadParams(), loadConditionSpecs(),
    JSON.parse(readFileSync('data/build/engine-baseline.json', 'utf8')).comparisons);
  return {
    name: 'engine-input',
    resolveId: id => (id === ENGINE_ID || id === META_ID ? '\0' + id : undefined),
    load(id) {
      if (id === '\0' + ENGINE_ID) return `export default JSON.parse(${JSON.stringify(JSON.stringify(bundle()))});`;
      if (id === '\0' + META_ID) return `export default JSON.parse(${JSON.stringify(JSON.stringify(metaOf(bundle())))});`;
      return undefined;
    },
  };
}

export default defineConfig({
  // Relative base so the built site works under a GitHub Pages project path (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [explorerData(), engineInput()],
  worker: { format: 'es', plugins: () => [engineInput()] },
  build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: { index: 'index.html', data: 'data.html' } } },
});
