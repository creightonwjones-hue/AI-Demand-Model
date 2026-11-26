export const SEC_USER_AGENT = 'AI-Demand-Model research contact@example.com';
const MIN_INTERVAL_MS = 125; // <= 8 requests/second, under the SEC 10/s limit
const RETRIES = 3;

let nextSlot = 0;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function throttle(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_INTERVAL_MS;
  if (slot > now) await sleep(slot - now);
}

export async function fetchWithPolicy(url: string): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
    await throttle();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' } });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
      if (res.status < 500 && res.status !== 429) throw lastErr;
    } catch (err) {
      lastErr = err;
      if (err instanceof Error && /^HTTP 4\d\d/.test(err.message) && !err.message.startsWith('HTTP 429')) throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(`failed to fetch ${url}`);
}
