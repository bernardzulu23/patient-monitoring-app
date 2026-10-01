/**
 * Quote a CSV cell and neutralise spreadsheet formulas (CSV/formula injection):
 * a leading = + - @ tab or CR makes Excel/LibreOffice evaluate the cell.
 */
export function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);

  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  if (/[",\r\n]/.test(v) || v !== value) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Safe for a Content-Disposition filename: no quotes, CR/LF, or path separators. */
export function safeFileName(name: string, fallback = "file") {
  const cleaned = name
    .replace(/[^A-Za-z0-9._ -]/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .slice(0, 100);
  return cleaned || fallback;
}
