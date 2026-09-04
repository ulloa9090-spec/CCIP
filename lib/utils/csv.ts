export interface CsvColumn {
  key: string;
  header: string;
}

/** RFC 4180-ish CSV: quotes a field only when it contains a comma, quote,
 * or newline; doubles embedded quotes. `\r\n` line endings for the widest
 * spreadsheet-app compatibility. */
export function toCsv(rows: Record<string, unknown>[], columns: CsvColumn[]): string {
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const header = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => escape(row[c.key])).join(","));
  return [header, ...lines].join("\r\n");
}
