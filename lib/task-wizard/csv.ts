// Items CSV for pairwise tasks: case_id, prompt, response_a, response_b.
// The whole file is rejected if any row is invalid; every problem is reported with its row number.

export const ITEM_COLUMNS = ["case_id", "prompt", "response_a", "response_b"] as const;
export type ItemRow = { case_id: string; prompt: string; response_a: string; response_b: string };

export const MAX_CELL_CHARS = 20_000;
export const MAX_ROWS = 5_000;
/** Stays under the 4.5 MB request limit of serverless hosts (and the 5 MB server action limit). */
export const MAX_CSV_BYTES = 4 * 1024 * 1024;

export type RowError = { row: number; column?: string; message: string };

/** RFC 4180 parser: quoted cells, "" escapes, commas and newlines inside quotes, CRLF, BOM. */
export function parseCsv(text: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let quotedCell = false;

  for (; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "" && !quotedCell) {
      inQuotes = true;
      quotedCell = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
      quotedCell = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      quotedCell = false;
    } else {
      cell += ch;
    }
  }
  if (inQuotes) return { rows, error: "A quoted cell is never closed (missing \")." };
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // Drop blank lines
  return { rows: rows.filter((r) => !(r.length === 1 && r[0].trim() === "")) };
}

function csvCell(v: string) {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function itemsCsvTemplate(): string {
  const example: ItemRow = {
    case_id: "CASE-001",
    prompt: "The question or task given to both AI models.",
    response_a: "The first AI response.",
    response_b: "The second AI response.",
  };
  return [ITEM_COLUMNS.join(","), ITEM_COLUMNS.map((c) => csvCell(example[c])).join(",")].join("\r\n") + "\r\n";
}

/** Checks one item (row = the 1-based CSV line number used in messages; header is row 1). */
export function checkItem(item: Partial<ItemRow>, row: number): RowError[] {
  const errors: RowError[] = [];
  for (const col of ITEM_COLUMNS) {
    const v = item[col];
    if (typeof v !== "string" || v.trim() === "") errors.push({ row, column: col, message: `${col} is empty` });
    else if (v.length > MAX_CELL_CHARS) {
      errors.push({ row, column: col, message: `${col} has ${v.length.toLocaleString("en-US")} characters (limit ${MAX_CELL_CHARS.toLocaleString("en-US")})` });
    }
  }
  if (typeof item.case_id === "string" && item.case_id.length > 200) {
    errors.push({ row, column: "case_id", message: "case_id is longer than 200 characters" });
  }
  return errors;
}

export type CsvCheck = {
  ok: boolean;
  total: number;
  rows: ItemRow[];
  /** problems with the file as a whole (size, header, quoting) */
  fileErrors: string[];
  rowErrors: RowError[];
};

export function validateItemsCsv(text: string): CsvCheck {
  const fail = (msg: string): CsvCheck => ({ ok: false, total: 0, rows: [], fileErrors: [msg], rowErrors: [] });
  if (typeof text !== "string" || text.trim() === "") return fail("The file is empty.");
  if (new TextEncoder().encode(text).length > MAX_CSV_BYTES) return fail("The file is larger than 4 MB. Split it into smaller files.");

  const parsed = parseCsv(text);
  if (parsed.error) return fail(parsed.error);
  const [header, ...body] = parsed.rows;
  if (!header) return fail("The file is empty.");

  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = ITEM_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) {
    return fail(`Missing column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. The header must be: ${ITEM_COLUMNS.join(", ")}.`);
  }
  if (body.length === 0) return fail("The file has a header but no rows.");
  if (body.length > MAX_ROWS) return fail(`The file has ${body.length} rows; the limit is ${MAX_ROWS} per upload.`);

  const index = Object.fromEntries(ITEM_COLUMNS.map((c) => [c, cols.indexOf(c)])) as Record<(typeof ITEM_COLUMNS)[number], number>;
  const rows: ItemRow[] = [];
  const rowErrors: RowError[] = [];
  const firstSeen = new Map<string, number>();

  body.forEach((cells, i) => {
    const rowNo = i + 2; // the header is row 1
    if (cells.length !== header.length) {
      rowErrors.push({ row: rowNo, message: `has ${cells.length} cells but the header has ${header.length}` });
    }
    const item = Object.fromEntries(ITEM_COLUMNS.map((c) => [c, cells[index[c]] ?? ""])) as ItemRow;
    item.case_id = item.case_id.trim();
    rowErrors.push(...checkItem(item, rowNo));
    if (item.case_id) {
      const prev = firstSeen.get(item.case_id);
      if (prev) rowErrors.push({ row: rowNo, column: "case_id", message: `duplicate case_id "${item.case_id}" (first used in row ${prev})` });
      else firstSeen.set(item.case_id, rowNo);
    }
    rows.push(item);
  });

  return { ok: rowErrors.length === 0, total: body.length, rows, fileErrors: [], rowErrors };
}

export function formatRowError(e: RowError): string {
  return `Row ${e.row}: ${e.message}`;
}
