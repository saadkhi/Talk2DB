/**
 * POST /api/autoflow/parse
 *
 * Accepts a multipart/form-data upload with a single "file" field.
 * Supports: .csv, .tsv, .xlsx, .xls, .pdf
 *
 * Returns:
 *   { fileName, format, columns, rows, totalRows, stats, sheets? }
 *
 * - columns   : string[]       — column names
 * - rows      : Record<string,any>[]  — up to 1000 preview rows
 * - totalRows : number         — actual total row count
 * - stats     : ColumnStat[]   — per-column null%, distinct, min/max/avg for numerics
 * - sheets    : string[]       — (Excel only) sheet names
 *
 * No database required — purely file processing.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// pdf-parse and xlsx are Node.js-only — mark this route as server-only
export const runtime = "nodejs";
export const maxDuration = 60;

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ColumnStat {
    name: string;
    type: "string" | "number" | "date" | "boolean" | "mixed";
    nullCount: number;
    nullPct: number;
    distinctCount: number;
    sampleValues: string[];
    // numerics only
    min?: number;
    max?: number;
    avg?: number;
    // date only
    minDate?: string;
    maxDate?: string;
}

export interface ParseResult {
    fileName: string;
    format: "csv" | "excel" | "pdf";
    columns: string[];
    rows: Record<string, any>[];
    totalRows: number;
    stats: ColumnStat[];
    sheets?: string[];
    text?: string; // PDF only — raw extracted text
}

// ── CSV parser (pure JS, no dep) ──────────────────────────────────────────────
function parseCSV(text: string): { columns: string[]; rows: Record<string, any>[] } {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
    if (lines.length === 0) return { columns: [], rows: [] };

    // Simple RFC-4180 CSV tokenizer
    function parseLine(line: string): string[] {
        const cells: string[] = [];
        let cur = "";
        let inQuote = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQuote) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQuote = false;
                else cur += ch;
            } else {
                if (ch === '"') inQuote = true;
                else if (ch === "," || ch === "\t") { cells.push(cur.trim()); cur = ""; }
                else cur += ch;
            }
        }
        cells.push(cur.trim());
        return cells;
    }

    // Find first non-empty line as header
    let headerIdx = 0;
    while (headerIdx < lines.length && !lines[headerIdx].trim()) headerIdx++;
    if (headerIdx >= lines.length) return { columns: [], rows: [] };

    const columns = parseLine(lines[headerIdx]).map((c, i) => c || `col_${i + 1}`);
    const rows: Record<string, any>[] = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cells = parseLine(lines[i]);
        const row: Record<string, any> = {};
        columns.forEach((col, j) => {
            row[col] = cells[j] ?? "";
        });
        rows.push(row);
    }

    return { columns, rows };
}

// ── Column statistics ─────────────────────────────────────────────────────────
function computeStats(columns: string[], rows: Record<string, any>[]): ColumnStat[] {
    return columns.map((col) => {
        const values = rows.map((r) => r[col]);
        const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
        const nullCount = values.length - nonNull.length;
        const nullPct = values.length > 0 ? Math.round((nullCount / values.length) * 100) : 0;

        // Distinct count
        const distinctSet = new Set(nonNull.map(String));
        const distinctCount = distinctSet.size;

        // Sample values (up to 5 unique)
        const sampleValues = Array.from(distinctSet).slice(0, 5).map(String);

        // Type detection
        const numericVals: number[] = [];
        const dateVals: Date[] = [];
        let numericCount = 0;
        let dateCount = 0;
        let boolCount = 0;

        for (const v of nonNull) {
            const s = String(v).trim();
            if (s === "true" || s === "false" || s === "1" || s === "0" || s.toLowerCase() === "yes" || s.toLowerCase() === "no") boolCount++;
            const n = Number(s.replace(/,/g, ""));
            if (!isNaN(n) && s !== "") { numericVals.push(n); numericCount++; }
            const d = new Date(s);
            if (!isNaN(d.getTime()) && s.length >= 8 && /\d{4}/.test(s)) { dateVals.push(d); dateCount++; }
        }

        let type: ColumnStat["type"] = "string";
        const majority = nonNull.length * 0.8;
        if (numericCount >= majority && nonNull.length > 0) type = "number";
        else if (dateCount >= majority && nonNull.length > 0) type = "date";
        else if (boolCount >= majority && nonNull.length > 0) type = "boolean";
        else if ((numericCount + dateCount) > 0 && (numericCount + dateCount) < majority) type = "mixed";

        const stat: ColumnStat = { name: col, type, nullCount, nullPct, distinctCount, sampleValues };

        if (type === "number" && numericVals.length > 0) {
            stat.min = Math.min(...numericVals);
            stat.max = Math.max(...numericVals);
            stat.avg = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
        }
        if (type === "date" && dateVals.length > 0) {
            const sorted = dateVals.sort((a, b) => a.getTime() - b.getTime());
            stat.minDate = sorted[0].toISOString().slice(0, 10);
            stat.maxDate = sorted[sorted.length - 1].toISOString().slice(0, 10);
        }

        return stat;
    });
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

    // File size guard — 20 MB max
    if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum size is 20 MB." }, { status: 400 });
    }

    try {
        // ── CSV / TSV ──────────────────────────────────────────────────────────
        if (ext === "csv" || ext === "tsv") {
            const text = await file.text();
            const { columns, rows } = parseCSV(text);
            const totalRows = rows.length;
            const previewRows = rows.slice(0, 1000);
            const stats = computeStats(columns, rows); // stats use all rows

            return NextResponse.json({
                fileName, format: "csv", columns, rows: previewRows, totalRows, stats,
            } satisfies ParseResult);
        }

        // ── Excel ──────────────────────────────────────────────────────────────
        if (ext === "xlsx" || ext === "xls") {
            const XLSX = await import("xlsx");
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
            const sheetNames = workbook.SheetNames;
            // Use first non-empty sheet
            const sheetName = formData.get("sheet") as string | null ?? sheetNames[0];
            const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[sheetNames[0]];

            const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
            if (rawRows.length < 2) {
                return NextResponse.json({ error: "Sheet appears to be empty or has no header row." }, { status: 400 });
            }

            const headerRow = (rawRows[0] as any[]).map((c: any, i: number) =>
                c !== null && c !== undefined && String(c).trim() !== "" ? String(c).trim() : `col_${i + 1}`
            );
            const dataRows = rawRows.slice(1).map((r: any[]) => {
                const row: Record<string, any> = {};
                headerRow.forEach((col, j) => {
                    const v = r[j];
                    row[col] = v instanceof Date ? v.toISOString().slice(0, 10) : (v ?? "");
                });
                return row;
            });

            const totalRows = dataRows.length;
            const previewRows = dataRows.slice(0, 1000);
            const stats = computeStats(headerRow, dataRows);

            return NextResponse.json({
                fileName, format: "excel", columns: headerRow, rows: previewRows,
                totalRows, stats, sheets: sheetNames,
            } satisfies ParseResult);
        }

        // ── PDF ────────────────────────────────────────────────────────────────
        if (ext === "pdf") {
            // pdf-parse is a CJS module — import the whole module and call it directly
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const pdfParse: (buf: Buffer, opts?: any) => Promise<any> =
                require("pdf-parse");
            const buffer = Buffer.from(await file.arrayBuffer());
            const data = await pdfParse(buffer);
            const text = data.text ?? "";

            // Try to extract table-like data from PDF text
            // Split into lines, detect delimiter patterns
            const lines = text.split("\n").map((l: string) => l.trim()).filter((l: string) => l.length > 0);

            // Heuristic: find lines that contain 2+ whitespace-separated or tab-separated tokens
            const tableLines = lines.filter((l: string) => /\s{2,}|\t/.test(l));

            let columns: string[] = [];
            let rows: Record<string, any>[] = [];

            if (tableLines.length >= 2) {
                // Use first table-like line as header
                const headerCells = tableLines[0].split(/\s{2,}|\t/).map((c: string) => c.trim()).filter((c: string) => c);
                columns = headerCells.map((c: string, i: number) => c || `col_${i + 1}`);
                rows = tableLines.slice(1).map((line: string) => {
                    const cells = line.split(/\s{2,}|\t/).map((c: string) => c.trim());
                    const row: Record<string, any> = {};
                    columns.forEach((col, j) => { row[col] = cells[j] ?? ""; });
                    return row;
                });
            }

            const totalRows = rows.length;
            const stats = columns.length > 0 ? computeStats(columns, rows) : [];

            return NextResponse.json({
                fileName, format: "pdf", columns, rows: rows.slice(0, 1000),
                totalRows, stats,
                text: text.slice(0, 8000), // first 8k chars for AI context
                pdfMeta: { pages: data.numpages, info: data.info },
            });
        }

        return NextResponse.json(
            { error: `Unsupported file type ".${ext}". Please upload a CSV, Excel (.xlsx/.xls), or PDF file.` },
            { status: 400 }
        );
    } catch (err: any) {
        console.error("[autoflow/parse]", err);
        return NextResponse.json({ error: err.message || "Failed to parse file" }, { status: 500 });
    }
}
