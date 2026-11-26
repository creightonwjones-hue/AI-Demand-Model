/**
 * Minimal RFC 4180 CSV parser: comma separator, double-quoted fields (with "" for a literal quote, and commas or
 * newlines inside quotes), LF or CRLF line ends. The first row is the header; blank lines are skipped.
 * Throws on an unterminated quote or a row whose field count differs from the header.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text; // strip BOM
  const endRow = () => {
    row.push(field);
    field = '';
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') {
      if (field !== '') throw new Error(`CSV: unexpected quote inside an unquoted field (row ${rows.length + 1})`);
      inQuotes = true; i++; continue;
    }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' && src[i + 1] === '\n') { endRow(); i += 2; continue; }
    if (c === '\n') { endRow(); i++; continue; }
    field += c; i++;
  }
  if (inQuotes) throw new Error('CSV: unterminated quote');
  if (field !== '' || row.length) endRow();

  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map((r, idx) => {
    if (r.length !== header.length) {
      throw new Error(`CSV: row ${idx + 2} has ${r.length} fields, header has ${header.length}`);
    }
    return Object.fromEntries(header.map((h, j) => [h, r[j]]));
  });
}
