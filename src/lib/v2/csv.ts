const NEEDS_QUOTE = /[";\n\r]/;

/** Excel-friendly CSV (semicolon separated, UTF-8 BOM). Neutralises spreadsheet formula injection. */
export const toCsv = (rows: (string | number | null | undefined)[][]): string => {
  const cell = (value: string | number | null | undefined): string => {
    let text = value === null || value === undefined ? '' : String(value);
    if (/^[=+@\t\r]/.test(text) || (/^-/.test(text) && !/^-?\d+([.,]\d+)?$/.test(text))) text = `'${text}`;
    return NEEDS_QUOTE.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `\uFEFF${rows.map((row) => row.map(cell).join(';')).join('\r\n')}\r\n`;
};
