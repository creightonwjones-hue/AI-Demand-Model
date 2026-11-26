import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { prepare } from './src/explorer/prepare';

const VIRTUAL_ID = 'virtual:explorer-data';
const RESOLVED_ID = '\0' + VIRTUAL_ID;
const FILES = ['entities', 'financials', 'series', 'deals', 'coverage', 'manifest'] as const;

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
      const data = prepare(raw as Parameters<typeof prepare>[0]);
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(data))});`;
    },
  };
}

export default defineConfig({
  // Relative base so the built site works under a GitHub Pages project path (https://<user>.github.io/<repo>/).
  base: './',
  plugins: [explorerData()],
  build: { outDir: 'dist', emptyOutDir: true },
});
