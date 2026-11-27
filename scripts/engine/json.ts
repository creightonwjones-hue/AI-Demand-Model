import { writeFileSync } from 'node:fs';

/** Write JSON with 2-space indent, escaping non-ASCII as \uXXXX (matches the committed config files). */
export function writeJson(path: string, data: unknown): void {
  const text = JSON.stringify(data, null, 2).replace(/[\u0080-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  writeFileSync(path, text + '\n');
}
