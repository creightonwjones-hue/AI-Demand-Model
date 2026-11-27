# Phase 3 — Canvas UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The locked one-canvas money-flow view (spec §6) driven by the phase 2 engine in the browser: One path playback over quarters, zoom into a deal in place, and a conditions panel where dragging a forecast line re-runs the engine.

**Architecture:** The engine runs unchanged in a Web Worker, fed by a build-time bundle of the committed data. Pure "scene" functions turn a `RunResult` into nodes, edges, labels and events for one quarter; thin SVG renderers draw them; one root transform gives pan/zoom. All UI state (condition overrides, setup name, quarter, zoom target) lives in the URL hash.

**Tech Stack:** TypeScript, Vite (multi-page), SVG, Web Workers, vitest, Playwright (pre-installed) for visual checks. No new runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-11-26-ai-demand-model-design.md` (§6 visual design, §9 conditions, §10 outputs, §14 technical shape, §15 phase 3). Mockup to match: `docs/mockups/canvas-v6.html`.

## Global Constraints

- Look: match `docs/mockups/canvas-v6.html` closely; white background with faint dot grid; light theme only.
- Layer colours: money `#c9683a`, labs `#6b5bb8`, financing `#2f8590` (already used by the explorer), clouds `#b2557d`, chips `#3d8a57`, supply `#4a72ad`. Reuse the tokens in `src/explorer/style.css`.
- Font: Mona Sans only, numbers in tabular figures. Never Inter, Space Grotesk, Poppins, Montserrat, Archivo, Figtree.
- Layer order top to bottom: money in → AI labs → developers & financing → clouds (cash-funded group, debt-funded group) → chip makers → supply chain; layer names at the left edge.
- Every money line has a label chip: plain title + yearly amount, e.g. "Buys GPUs $200B".
- Problems: amber outline + "Stressed" tag; red outline + "Default" tag. Broken flows red and dashed; stressed flows slower dots.
- UI says "forecast range", never "Wall Street". Dragging outside the range flags "outside forecasts".
- No premade scenarios. Opens on the data baseline. A user setup can be named and lives entirely in the page link.
- Visible label "Early version: simple rules, not yet validated" on the canvas page.
- Quality floor: laptop (1440×900) and large screen (2560×1440); visible keyboard focus; `prefers-reduced-motion` stops flow dots.
- Out of scope (show as disabled controls with a one-line "arrives in phase N" tooltip): Range of outcomes switch (phase 6), decision game tree/payoff table on click (phase 4), early-warning dashboard (phase 7).
- Commits end with the session's Co-Authored-By / Claude-Session trailer lines.

## Review Focus

1. **Browser data differs from the Node build.** The trimmed bundle must give a byte-identical `runOnePath` result to the full `data/build` (Task 1 parity test).
2. **Extreme drags.** Dragging a condition to 0, below 0 or far above the range must clamp to the condition's allowed bounds and never produce NaN/Infinity in the run (Task 7).
3. **Broken or old links.** A malformed or outdated hash opens the baseline with a short note, never a blank page (Task 2).
4. **Out-of-order worker replies.** Rapid drags send many runs; a stale reply must never overwrite a newer one (Task 2).
5. **Empty or defaulted quarters.** A company with no flows, or one that defaulted, draws no zero-width or NaN line; defaulted payers show red dashed lines and the Default tag (Task 3).

---

### Task 1: Browser-safe engine and engine input bundle

**Files:**
- Create: `src/engine/node-io.ts` (all `node:fs` reads: `loadBuild`, `loadParams`, `loadConditionSpecs`; registers condition defaults), `src/engine/browser-input.ts` (`trimBuild`)
- Modify: `src/engine/asof.ts`, `src/engine/params.ts`, `src/engine/conditions.ts` (keep pure `parseBuild`, `parseParams`, `parseConditionSpecs`; no `node:` imports), every import of the moved loaders (tests, scripts), `vite.config.ts` (virtual module `virtual:engine-input`)
- Test: `tests/engine/browser-input.test.ts`

**Interfaces:**
- Produces: `parseBuild(raw: Record<'entities'|'financials'|'series'|'deals', unknown>): BuildData`; `parseParams(raw: unknown): EngineParams`; `parseConditionSpecs(raw: unknown): ConditionSpecs`; `trimBuild(b: BuildData, from = '2021-01-01'): BuildData` (drops series points dated before `from`; facts, deals, entities unchanged); `EngineInputBundle { build: BuildData; params: EngineParams; specs: ConditionSpecs; asOf: string /* latestBuildDate */; start: QuarterKey /* as run-baseline.ts */; comparisons: BaselineComparisons /* from data/build/engine-baseline.json */ }` served by `virtual:engine-input`.
- `buildConditions` without `opts.specs`/`opts.params` uses defaults registered by `node-io.ts`; with neither, it throws `condition specs not loaded`.

- [ ] **Step 1: Write failing tests**

```ts
it('trimmed browser build runs identically to the full build', () => {
  const full = loadBuild(), params = loadParams(), specs = loadConditionSpecs()
  const asOf = latestBuildDate(full), grid = makeGrid()
  const run = (b: BuildData) => runOnePath({ build: b, params, asOf, start: '2026Q3',
    conditions: buildConditions(asOfView(b, asOf), grid, asOf, { specs, params }) })
  expect(JSON.stringify(run(trimBuild(full)))).toBe(JSON.stringify(run(full)))
})
it('no engine module except node-io imports node built-ins', () => {
  for (const f of globSync('src/engine/**/*.ts').filter(f => !f.endsWith('node-io.ts')))
    expect(readFileSync(f, 'utf8')).not.toMatch(/from 'node:/)
})
it('trimmed series are smaller', () => expect(JSON.stringify(trimBuild(loadBuild()).series).length).toBeLessThan(2.5e6))
```

- [ ] **Step 2: Run** `npx vitest run tests/engine/browser-input.test.ts` — Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** the split and `trimBuild`; update imports (`grep -rl "loadBuild\|loadParams\|loadConditionSpecs" src tests scripts`). If parity fails, raise `from` earlier until it passes and record the value.
- [ ] **Step 4: Add** `virtual:engine-input` to `vite.config.ts` (reads `data/build/{entities,financials,series,deals}.json`, `config/engine-params.json`, `config/conditions.json`; returns the bundle with `trimBuild` applied).
- [ ] **Step 5: Run** `npx vitest run` — Expected: all pass.
- [ ] **Step 6: Commit** `refactor(engine): browser-safe engine and trimmed engine input bundle`.

---

### Task 2: App shell, engine worker and link state

**Files:**
- Create: `canvas.html` → becomes `index.html` (canvas app); move the explorer to `data.html` (update `vite.config.ts` `build.rollupOptions.input` for both pages; link "Data" in the canvas header, "Canvas" in the explorer header); `src/app/main.ts`, `src/app/worker.ts`, `src/app/run-client.ts`, `src/app/url-state.ts`, `src/app/style.css`
- Test: `tests/app/url-state.test.ts`, `tests/app/run-client.test.ts`

**Interfaces:**
- Consumes: `EngineInputBundle`, `runOnePath`, `buildConditions`, `withUserPath`, `asOfView`.
- Produces:
  - `AppState { name?: string; overrides: Partial<Record<ConditionId, Partial<Record<QuarterKey, number>>>>; quarter: QuarterKey; focus?: { dealId: string } }`
  - `encodeState(s: AppState): string` / `decodeState(hash: string, bundle: { start: QuarterKey }): { state: AppState; note?: string }` — base64url JSON under `#s=`; versioned `{ v: 1, ... }`; any parse/validation failure returns the default state (quarter = bundle.start) and `note: 'This link could not be read, so the baseline is shown.'`; unknown condition ids and quarters outside the grid are dropped with a note.
  - Worker protocol: request `{ id: number; overrides: AppState['overrides'] }` → reply `{ id: number; run: RunResult; conditions: Conditions }`. `worker.ts` builds conditions once from the bundle, applies overrides with `withUserPath`, runs `runOnePath`.
  - `createRunClient(post: (req) => void): { request(overrides): Promise<Reply>; onReply(reply): void }` — resolves only the newest request id; older replies are discarded.

- [ ] **Step 1: Write failing tests**

```ts
it('round-trips a named setup', () => {
  const s: AppState = { name: 'Credit squeeze', overrides: { creditSpread: { '2027Q2': 6.5 } }, quarter: '2027Q4' }
  expect(decodeState(encodeState(s), { start: '2026Q3' }).state).toEqual(s)
})
it('opens the baseline with a note for a broken link', () => {
  const r = decodeState('#s=%%%not-base64', { start: '2026Q3' })
  expect(r.state).toEqual({ overrides: {}, quarter: '2026Q3' })
  expect(r.note).toMatch(/could not be read/)
})
it('drops unknown conditions and off-grid quarters with a note', () => {
  const r = decodeState(encodeState({ overrides: { nope: { '2027Q1': 1 }, riskFree: { '2040Q1': 3 } } as never, quarter: '2027Q1' }), { start: '2026Q3' })
  expect(r.state.overrides).toEqual({})
  expect(r.note).toBeDefined()
})
it('never lets a stale reply win', async () => {
  const sent: { id: number }[] = []
  const c = createRunClient(req => sent.push(req))
  const a = c.request({}), b = c.request({ riskFree: { '2027Q1': 5 } })
  c.onReply({ id: sent[1].id, run: 'new' as never, conditions: {} as never })
  c.onReply({ id: sent[0].id, run: 'old' as never, conditions: {} as never })
  expect((await b).run).toBe('new')
  await expect(Promise.race([a, Promise.resolve('pending')])).resolves.toBe('pending')
})
```

- [ ] **Step 2: Run** `npx vitest run tests/app` — Expected: FAIL.
- [ ] **Step 3: Implement** the files; `main.ts` reads the hash, shows `note` in a dismissible bar, posts the first run, and renders a placeholder until Task 4. Hash updates use `history.replaceState` (debounced 300 ms).
- [ ] **Step 4: Run** `npx vitest run && npm run build` — Expected: pass; `dist/index.html` and `dist/data.html` exist.
- [ ] **Step 5: Commit** `feat(app): canvas page shell, engine worker and link state`.

---

### Task 3: Scene model (pure)

**Files:**
- Create: `src/app/scene.ts`, `config/canvas-layout.json` (per-entity group membership and preferred order within a layer; entities not listed are placed by yearly flow volume)
- Test: `tests/app/scene.test.ts`

**Interfaces:**
- Consumes: `RunResult`, `Entity` list from the bundle.
- Produces:
  - `SceneNode { id: string; name: string; layer: Layer; group?: 'cash-clouds' | 'debt-clouds' | 'labs'; x: number; y: number; w: number; h: number; status: 'ok' | 'stressed' | 'default' }`
  - `SceneEdge { id: string /* from|to|label */; from: string; to: string; label: string; usdPerYear: number; kind: FlowKind; dealIds: string[]; status: 'ok' | 'stressed' | 'broken'; width: number }`
  - `SceneEvent { entityId: string; quarter: QuarterKey; letter: string; text: string }`
  - `buildScene(run: RunResult, entities: EntityLite[], quarter: QuarterKey, layout: CanvasLayout): { nodes: SceneNode[]; edges: SceneEdge[]; events: SceneEvent[]; groups: { id: string; label: string; x: number; y: number; w: number; h: number }[] }`
- Rules: `usdPerYear` = sum of the 4 quarters ending at `quarter` (fewer at the grid start, annualised ×4/n); edges grouped by (from, to, label); edges below $0.5B/yr dropped; `width` = 1 + 7·sqrt(usd / maxUsd); node status from that quarter's `EntityQuarter` (`defaulted` → default; `minsky` speculative/ponzi → stressed); edge status broken when payer defaulted at or before `quarter`, stressed when payer stressed; operating-cost and core-business-cash flows to/from `rest-of-economy` are hidden; nodes with no visible edge are hidden except NVIDIA, TSMC, SK Hynix, Alphabet (the fund's holdings) — always shown. Events: the run's events in the 4-quarter window, letters A, B, C… per quarter order.

- [ ] **Step 1: Write failing tests** (fixture: `runOnePath` on the bundle baseline, computed once)

```ts
it('lays out layers top to bottom in spec order', () => {
  const ys = ['money','labs','financing','cloud','chips','supply'].map(l => Math.min(...sc.nodes.filter(n => n.layer === l).map(n => n.y)))
  expect([...ys].sort((a, b) => a - b)).toEqual(ys)
})
it('labels every edge with a title and positive finite yearly amount', () =>
  expect(sc.edges.every(e => e.label && Number.isFinite(e.usdPerYear) && e.usdPerYear >= 0.5e9 && e.width >= 1 && e.width <= 8)).toBe(true))
it('always shows the fund holdings', () =>
  expect(['nvidia','tsmc','sk-hynix','alphabet'].every(id => sc.nodes.some(n => n.id === id))).toBe(true))
it('marks a defaulted payer and its lines broken', () => {
  const run = withDefault(baseline, 'coreweave', '2027Q2') // helper sets entities.coreweave[i].defaulted from 2027Q2
  const s = buildScene(run, entities, '2027Q4', layout)
  expect(s.nodes.find(n => n.id === 'coreweave')?.status).toBe('default')
  expect(s.edges.filter(e => e.from === 'coreweave').every(e => e.status === 'broken')).toBe(true)
})
it('puts the four cash-funded clouds in one group and the debt-funded in another', () => {
  expect(sc.nodes.filter(n => n.group === 'cash-clouds').map(n => n.id).sort()).toEqual(['alphabet','amazon','meta','microsoft'])
})
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/app/scene.test.ts`.
- [ ] **Step 5: Commit** `feat(app): scene model from engine runs`.

---

### Task 4: Canvas renderer, pan/zoom and flow dots

**Files:**
- Create: `src/app/canvas/render.ts` (SVG strings for groups, cards, edges, label chips, event notes), `src/app/canvas/viewport.ts` (pan/zoom maths), `src/app/canvas/flow-dots.ts` (animation), `src/app/canvas/canvas.css`
- Modify: `src/app/main.ts`
- Test: `tests/app/viewport.test.ts`, `tests/app/render.test.ts`
- Verify: `scripts/ui/shots.cjs` (Playwright; screenshots to the scratchpad)

**Interfaces:**
- Consumes: `buildScene` output.
- Produces: `Viewport { x: number; y: number; k: number }`; `zoomAt(v, px, py, factor, kMin = 0.3, kMax = 6): Viewport` (keeps the point under the cursor fixed); `fit(bounds, screenW, screenH, pad = 40): Viewport`; `renderScene(scene): string`; `startFlowDots(svg: SVGSVGElement, edges: SceneEdge[], payerColour: (id) => string): () => void` (stop function; dots per edge 1–6 and speed ∝ sqrt(usd); stressed ×0.4 speed; broken: no dots; does nothing under `prefers-reduced-motion`).
- Edge geometry: cubic curve from the bottom-centre of the payer card to the top-centre of the payee card (upward flows the reverse); label chip at the curve midpoint, nudged to avoid overlap with other chips (simple vertical sweep).

- [ ] **Step 1: Write failing tests**

```ts
it('zooms about the cursor', () => {
  const v = zoomAt({ x: 0, y: 0, k: 1 }, 200, 100, 2)
  expect((200 - v.x) / v.k).toBeCloseTo(200); expect((100 - v.y) / v.k).toBeCloseTo(100)
})
it('clamps zoom', () => expect(zoomAt({ x: 0, y: 0, k: 5 }, 0, 0, 10).k).toBe(6))
it('fit centres the bounds', () => { const v = fit({ x: 0, y: 0, w: 1000, h: 500 }, 1440, 900); expect(v.k).toBeGreaterThan(0) })
it('renders a label chip per edge and tags problems', () => {
  const html = renderScene(sc)
  expect((html.match(/class="chip"/g) ?? []).length).toBe(sc.edges.length)
  expect(html).toMatch(/Buys GPUs \$\d/)
})
it('draws broken edges dashed red', () => expect(renderScene(brokenScene)).toMatch(/class="edge broken"/))
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS): `npx vitest run tests/app`.
- [ ] **Step 5: Wire** drag to pan, wheel/pinch to zoom, +/−/Fit buttons (bottom right), keyboard: arrow keys pan, `+`/`-` zoom, `0` fit, Tab moves between company cards with visible focus ring.
- [ ] **Step 6: Verify visually:** `npm run build && npx vite preview --port 4173`, then `node scripts/ui/shots.cjs` at 1440×900 and 2560×1440; compare against `docs/mockups/canvas-v6.html` screenshots taken the same way; describe differences in the task report and fix any that break the Global Constraints.
- [ ] **Step 7: Commit** `feat(app): money-flow canvas with pan, zoom and flow dots`.

---

### Task 5: Timeline, playback, NVIDIA card and event notes

**Files:**
- Create: `src/app/timeline.ts`, `src/app/nvidia-card.ts`
- Modify: `src/app/main.ts`, `src/app/canvas/render.ts` (event notes beside cards)
- Test: `tests/app/nvidia-card.test.ts`, `tests/app/timeline.test.ts`

**Interfaces:**
- Consumes: `RunResult`, `bundle.comparisons` (Task 1), `fiscalYearSum` logic as in `src/explorer/engine-section.ts`.
- Produces:
  - `nvidiaCard(run, comparisons, quarter): { quarterRevenue: number; fy: number; fyModel: number; fyConsensus?: number; dataCenter: number; eps: number; supplyBound: boolean; modelled: boolean }` — `fy` is the NVIDIA fiscal year containing `quarter` (calendar year + 1).
  - `timelineTicks(grid, start): { quarter: QuarterKey; history: boolean; markers: SceneEvent[] }[]`; play advances one quarter per 900 ms (stops at the end; space bar toggles).

- [ ] **Step 1: Write failing tests**

```ts
it('NVIDIA card uses the fiscal year containing the quarter', () => {
  const c = nvidiaCard(run, comparisons, '2027Q3')
  expect(c.fy).toBe(2028); expect(c.fyConsensus).toBeCloseTo(726.23e9, -7)
  expect(c.fyModel).toBeCloseTo(['2027Q1','2027Q2','2027Q3','2027Q4'].reduce((t, q) => t + run.nvidia[g.idx(q)].revenue, 0), -3)
})
it('history quarters are marked and not modelled', () => {
  expect(nvidiaCard(run, comparisons, '2026Q1').modelled).toBe(false)
  expect(timelineTicks(g, '2026Q3').find(t => t.quarter === '2026Q2')!.history).toBe(true)
})
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Wire:** card top right (revenue this quarter, FY model vs consensus with % gap, Data Center, EPS, "Supply-bound" tag); timeline bottom centre with history shaded, event markers, play/pause; scrubbing re-renders the scene for that quarter without re-running the engine.
- [ ] **Step 6: Commit** `feat(app): timeline playback, NVIDIA card and event notes`.

---

### Task 6: Zoom into a deal in place

**Files:**
- Create: `src/app/deal-view.ts`
- Modify: `src/app/main.ts`, `src/app/canvas/render.ts`
- Test: `tests/app/deal-view.test.ts`

**Interfaces:**
- Consumes: `DealView` (from `asOfView(bundle.build, bundle.asOf).deals`), the clicked `SceneEdge`.
- Produces: `dealStructure(deal: DealView, entities): { parties: { id: string; name: string; role: string }[]; vehicles: { id: string; name: string; kind: 'spv' | 'loan' | 'lease' | 'guarantee' | 'contract' }[]; links: { from: string; to: string; label: string }[]; terms: { label: string; value: string; source?: string }[] }` — built from the deal's parties, values (each value field shown with its own name, never summed), terms (hidden terms shown as "Not yet public") and sources.
- Behaviour: clicking an edge with `dealIds` (or its chip) animates the viewport to fit the edge, then draws the structure inside a rounded panel anchored between the two cards; other cards fade to 25% opacity; edges with several deals show a small list to pick from; Esc or clicking empty canvas zooms back; `AppState.focus` holds the deal id so links reopen the zoom. The NVIDIA card switches to "Exposure in this deal" (NVIDIA's role, amounts by value field) while zoomed.

- [ ] **Step 1: Write failing tests**

```ts
it('shows each deal value field by name and never a sum', () => {
  const s = dealStructure(deal('coreweave-ddtl-3'), entities)
  expect(s.terms.some(t => /ceiling/i.test(t.label))).toBe(true)
  expect(s.terms.some(t => /total/i.test(t.label))).toBe(false)
})
it('says "Not yet public" for hidden terms', () => {
  const hidden = asOfView(build, '2024-01-01').deals.find(d => d.termsHidden)!
  expect(dealStructure(hidden, entities).terms.some(t => t.value === 'Not yet public')).toBe(true)
})
it('lists every party with a role', () => {
  expect(dealStructure(deal('meta-coreweave-2025'), entities).parties.every(p => p.role.length > 0)).toBe(true)
})
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Verify** with Playwright: click a CoreWeave loan line, screenshot the zoomed state at 1440×900; Esc returns to the fitted view.
- [ ] **Step 6: Commit** `feat(app): zoom into a deal in place`.

---

### Task 7: Conditions panel with drag-the-line

**Files:**
- Create: `src/app/conditions/chart.ts` (pure maths), `src/app/conditions/panel.ts` (DOM + drag), `config/condition-bounds.json` (hard bounds per condition: e.g. `creditSpread [0, 30]`, `riskFree [0, 20]`, `powerGw [0, 10000]`, `exportRegime` allowed `{0, 0.5, 1}`)
- Modify: `src/app/main.ts`
- Test: `tests/app/condition-chart.test.ts`

**Interfaces:**
- Consumes: `Conditions` from the worker reply, `AppState.overrides`, run client.
- Produces: `chartModel(path: ConditionPath, grid, asOf: string, w: number, h: number): { history: [number, number][]; band: string /* SVG path */; handles: { quarter: QuarterKey; x: number; y: number }[]; yToValue(y: number): number }`; `clampValue(id: ConditionId, v: number, bounds): number` (snaps `exportRegime` to the nearest allowed value); `outsideForecasts(path, quarter, v): boolean` (v < low or v > high).
- Behaviour: Conditions button (top left) opens a panel of small charts, one per condition: history solid, forecast range shaded, path line with a handle per future quarter; dragging a handle moves that quarter and eases neighbours by 50% / 25% (two quarters each side) so the line stays smooth; values clamp; outside the range the handle turns amber and the chart says "outside forecasts"; hovering the band shows `rangeSource`; each drag end sends one worker request and updates the hash; "Reset" per chart and "Reset all"; a "Name this setup" field writes `AppState.name`. Elasticity is shown as a single number setting, not a time path.

- [ ] **Step 1: Write failing tests**

```ts
it('clamps extreme drags and snaps the export regime', () => {
  expect(clampValue('creditSpread', -5, bounds)).toBe(0)
  expect(clampValue('creditSpread', 99, bounds)).toBe(30)
  expect(clampValue('exportRegime', 0.4, bounds)).toBe(0.5)
})
it('flags values outside the forecast range', () => {
  const p = conditions.creditSpread, q = '2028Q1', i = g.idx(q)
  expect(outsideForecasts(p, q, p.high[i] + 1)).toBe(true)
  expect(outsideForecasts(p, q, (p.low[i] + p.high[i]) / 2)).toBe(false)
})
it('has handles only for quarters after the as-of date', () =>
  expect(chartModel(conditions.riskFree, g, '2026-11-27', 240, 90).handles.every(h => h.quarter >= '2026Q4')).toBe(true))
it('an extreme dragged path still runs cleanly', () => {
  const c = withUserPath(conditions, 'creditSpread', { '2027Q1': clampValue('creditSpread', 1e9, bounds) })
  const r = runOnePath({ build, params, asOf, start: '2026Q3', conditions: c })
  expect(r.invariantErrors).toEqual([])
  expect(r.nvidia.every(n => Number.isFinite(n.revenue))).toBe(true)
})
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Verify** with Playwright: drag the credit-spread line to 8 in 2027, wait for the re-run, screenshot; reload the page from the resulting URL and confirm the same canvas (same NVIDIA FY numbers).
- [ ] **Step 6: Commit** `feat(app): conditions panel with drag-the-line`.

---

### Task 8: Phase checkpoint — placeholders, quality floor, deploy

**Files:**
- Modify: `src/app/main.ts`, `src/app/style.css`, `.github/workflows/pages.yml` (no change expected beyond the two-page build; confirm), `README` section if one exists
- Test: `tests/app/a11y.test.ts`

**Interfaces:**
- Produces: disabled controls with tooltips — "Range of outcomes" (arrives in phase 6), click on a company's decision note (phase 4), early-warning dashboard button (phase 7).

- [ ] **Step 1: Write failing tests**

```ts
it('every interactive element in the rendered scene is focusable with a label', () => {
  const html = renderScene(sc)
  for (const m of html.matchAll(/<g class="card"[^>]*>/g)) { expect(m[0]).toMatch(/tabindex="0"/); expect(m[0]).toMatch(/aria-label="/) }
})
it('flow dots do nothing under reduced motion', () => {
  const stop = startFlowDots(fakeSvg, sc.edges, () => '#000', { reducedMotion: true })
  expect(fakeSvg.children.length).toBe(0); stop()
})
```

- [ ] **Step 2–4:** run (FAIL), implement, run (PASS).
- [ ] **Step 5: Verify:** `npm run build`; Playwright shots at 1440×900 and 2560×1440 (canvas, zoomed deal, conditions panel open); time from load to first canvas under 3 s on the preview server; `dist/` total under 6 MB; describe the shots in the report.
- [ ] **Step 6: Commit** `feat(app): phase 3 checkpoint — placeholders and quality floor`.

---

## Out of scope (later phases)

- Strategic decisions, game tree / payoff table on click — phase 4.
- Credit contagion visuals beyond Stressed/Default tags — phase 5.
- Range of outcomes fan charts and probability statements — phase 6.
- Early-warning dashboard, sensitivity view, scheduled data refresh — phase 7.
