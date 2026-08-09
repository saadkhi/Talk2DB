/**
 * POST /api/autoflow/compare
 *
 * Compares two datasets. Supports three modes:
 *   mode: "file-file"  — compare datasetA vs datasetB (both parsed client-side)
 *   mode: "file-db"    — compare datasetA rows against a DB table
 *
 * Body (JSON):
 * {
 *   mode: "file-file" | "file-db",
 *   datasetA: { columns: string[], rows: Record<string,any>[], fileName?: string },
 *   datasetB?: { columns: string[], rows: Record<string,any>[], fileName?: string },
 *   matchColumn: string,       // column in datasetA to match on
 *   matchColumnB?: string,     // column in datasetB / DB table to match on (default: same as matchColumn)
 *   compareColumns?: string[], // columns to diff values on (default: all shared columns)
 *   fuzzyThreshold?: number,   // 0–100, default 85
 *   // file-db only:
 *   dbTable?: string,
 *   connectionId?: string,
 * }
 *
 * Returns:
 * {
 *   summary: { totalA, totalB, exactMatches, fuzzyMatches, onlyInA, onlyInB, conflicts },
 *   matches: MatchRow[],
 *   onlyInA: Record<string,any>[],
 *   onlyInB: Record<string,any>[],
 *   conflicts: ConflictRow[],
 * }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { executeQuery } from "@/lib/dbConnection";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── Levenshtein-based fuzzy score (0–100) ─────────────────────────────────────
function fuzzyScore(a: string, b: string): number {
    const s1 = String(a ?? "").toLowerCase().trim();
    const s2 = String(b ?? "").toLowerCase().trim();
    if (s1 === s2) return 100;
    if (!s1 || !s2) return 0;

    const maxLen = Math.max(s1.length, s2.length);
    // Levenshtein distance
    const dp: number[][] = Array.from({ length: s1.length + 1 }, (_, i) =>
        Array.from({ length: s2.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            dp[i][j] = s1[i - 1] === s2[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
        }
    }
    return Math.round(((maxLen - dp[s1.length][s2.length]) / maxLen) * 100);
}

interface MatchRow {
    keyA: string;
    keyB: string;
    score: number;
    matchType: "exact" | "fuzzy";
    rowA: Record<string, any>;
    rowB: Record<string, any>;
    diffs: { column: string; valueA: any; valueB: any }[];
}

interface ConflictRow {
    keyA: string;
    keyB: string;
    column: string;
    valueA: any;
    valueB: any;
    score: number;
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
        mode = "file-file",
        datasetA,
        datasetB: rawDatasetB,
        matchColumn,
        matchColumnB,
        compareColumns,
        fuzzyThreshold = 85,
        dbTable,
        connectionId,
    } = body;

    if (!datasetA?.rows?.length) {
        return NextResponse.json({ error: "datasetA is required and must have rows" }, { status: 400 });
    }
    if (!matchColumn) {
        return NextResponse.json({ error: "matchColumn is required" }, { status: 400 });
    }

    // ── Resolve dataset B ──────────────────────────────────────────────────────
    let rowsB: Record<string, any>[] = [];
    let colsB: string[] = [];
    let fileNameB = "";

    if (mode === "file-db") {
        if (!dbTable) return NextResponse.json({ error: "dbTable is required for file-db mode" }, { status: 400 });

        const user = await resolveUserWithDb(session, connectionId);
        if (!user?.dbConnectionString) {
            return NextResponse.json({ error: "No database connected." }, { status: 400 });
        }

        try {
            const safeTable = dbTable.replace(/[^a-zA-Z0-9_]/g, "");
            const result = await executeQuery(
                user.dbConnectionString,
                `SELECT * FROM "${safeTable}" LIMIT 10000`
            );
            rowsB = result.rows;
            colsB = Object.keys(rowsB[0] ?? {});
            fileNameB = `DB: ${dbTable}`;
        } catch (err: any) {
            return NextResponse.json({ error: `Failed to query DB table: ${err.message}` }, { status: 400 });
        }
    } else {
        if (!rawDatasetB?.rows?.length) {
            return NextResponse.json({ error: "datasetB is required for file-file mode" }, { status: 400 });
        }
        rowsB = rawDatasetB.rows;
        colsB = rawDatasetB.columns ?? Object.keys(rowsB[0] ?? {});
        fileNameB = rawDatasetB.fileName ?? "Dataset B";
    }

    const rowsA: Record<string, any>[] = datasetA.rows;
    const colsA: string[] = datasetA.columns ?? Object.keys(rowsA[0] ?? {});
    const keyColB = matchColumnB ?? matchColumn;

    // Shared columns to diff
    const sharedCols = compareColumns
        ?? colsA.filter((c) => c !== matchColumn && colsB.includes(c));

    // Row size guard
    if (rowsA.length > 50000 || rowsB.length > 50000) {
        return NextResponse.json({ error: "Dataset too large for comparison (max 50,000 rows each)." }, { status: 400 });
    }

    // ── Build index for B ──────────────────────────────────────────────────────
    const indexB = new Map<string, Record<string, any>[]>();
    for (const row of rowsB) {
        const key = String(row[keyColB] ?? "").toLowerCase().trim();
        if (!indexB.has(key)) indexB.set(key, []);
        indexB.get(key)!.push(row);
    }

    const matches: MatchRow[] = [];
    const matchedBKeys = new Set<string>();
    const onlyInA: Record<string, any>[] = [];

    for (const rowA of rowsA) {
        const keyA = String(rowA[matchColumn] ?? "").toLowerCase().trim();
        if (!keyA) { onlyInA.push(rowA); continue; }

        // 1. Exact match
        if (indexB.has(keyA)) {
            const candidates = indexB.get(keyA)!;
            const rowB = candidates[0];
            matchedBKeys.add(keyA);

            const diffs = (sharedCols as string[])
                .filter((col: string) => String(rowA[col] ?? "") !== String(rowB[col] ?? ""))
                .map((col: string) => ({ column: col, valueA: rowA[col], valueB: rowB[col] }));

            matches.push({
                keyA: String(rowA[matchColumn]),
                keyB: String(rowB[keyColB]),
                score: 100,
                matchType: "exact",
                rowA, rowB, diffs,
            });
            continue;
        }

        // 2. Fuzzy match — scan all B keys
        let bestScore = 0;
        let bestKey = "";
        let bestRow: Record<string, any> | null = null;

        for (const [bKey, bRows] of indexB.entries()) {
            const score = fuzzyScore(keyA, bKey);
            if (score > bestScore) {
                bestScore = score;
                bestKey = bKey;
                bestRow = bRows[0];
            }
        }

        if (bestScore >= fuzzyThreshold && bestRow) {
            matchedBKeys.add(bestKey);
            const diffs = (sharedCols as string[])
                .filter((col: string) => String(rowA[col] ?? "") !== String(bestRow![col] ?? ""))
                .map((col: string) => ({ column: col, valueA: rowA[col], valueB: bestRow![col] }));

            matches.push({
                keyA: String(rowA[matchColumn]),
                keyB: String(bestRow[keyColB]),
                score: bestScore,
                matchType: "fuzzy",
                rowA, rowB: bestRow, diffs,
            });
        } else {
            onlyInA.push(rowA);
        }
    }

    // Rows only in B
    const onlyInB = rowsB.filter((row) => {
        const key = String(row[keyColB] ?? "").toLowerCase().trim();
        return !matchedBKeys.has(key);
    });

    // Conflicts = matched rows with value differences
    const conflicts: ConflictRow[] = matches
        .filter((m) => m.diffs.length > 0)
        .flatMap((m) =>
            m.diffs.map((d) => ({
                keyA: m.keyA,
                keyB: m.keyB,
                column: d.column,
                valueA: d.valueA,
                valueB: d.valueB,
                score: m.score,
            }))
        );

    const exactMatches = matches.filter((m) => m.matchType === "exact").length;
    const fuzzyMatches = matches.filter((m) => m.matchType === "fuzzy").length;

    return NextResponse.json({
        summary: {
            totalA: rowsA.length,
            totalB: rowsB.length,
            exactMatches,
            fuzzyMatches,
            totalMatches: matches.length,
            onlyInA: onlyInA.length,
            onlyInB: onlyInB.length,
            conflicts: conflicts.length,
            matchRate: rowsA.length > 0 ? Math.round((matches.length / rowsA.length) * 100) : 0,
        },
        matches: matches.slice(0, 500),
        onlyInA: onlyInA.slice(0, 200),
        onlyInB: onlyInB.slice(0, 200),
        conflicts: conflicts.slice(0, 500),
        meta: {
            fileNameA: datasetA.fileName ?? "Dataset A",
            fileNameB,
            matchColumn,
            keyColB,
            sharedCols,
            fuzzyThreshold,
        },
    });
}
