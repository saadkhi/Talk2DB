"use client";
import React, { useRef, useCallback } from "react";

/* ── SQL token definitions ─────────────────────────────────── */
const KEYWORDS = new Set([
    "SELECT","FROM","WHERE","JOIN","INNER","LEFT","RIGHT","OUTER","FULL","CROSS",
    "ON","AND","OR","NOT","IN","IS","NULL","LIKE","BETWEEN","EXISTS",
    "ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","DISTINCT","AS","WITH",
    "CASE","WHEN","THEN","ELSE","END","ASC","DESC","UNION","ALL",
    "INTERSECT","EXCEPT","INTO","VALUES","SET","TABLE","VIEW","INDEX",
    "CREATE","DROP","ALTER","INSERT","UPDATE","DELETE","TRUNCATE",
    "TRUE","FALSE","RETURNING","USING","LATERAL",
]);

const FUNCTIONS = new Set([
    "COUNT","SUM","AVG","MIN","MAX","ARRAY_AGG","STRING_AGG","JSON_AGG",
    "COALESCE","NULLIF","CAST","EXTRACT","DATE_TRUNC","NOW","CURRENT_DATE",
    "CURRENT_TIMESTAMP","TO_CHAR","TO_DATE","LENGTH","LOWER","UPPER","TRIM",
    "SUBSTRING","REPLACE","CONCAT","ROUND","CEIL","FLOOR","ABS","MOD",
    "ROW_NUMBER","RANK","DENSE_RANK","LAG","LEAD","OVER","PARTITION",
]);

/* Tokenize a SQL string into colored spans */
function highlightSQL(sql: string): string {
    if (!sql) return "";
    // Escape HTML entities
    const esc = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Tokenizer — processes character by character
    let result = "";
    let i = 0;
    const len = sql.length;

    while (i < len) {
        // Single-line comment
        if (sql[i] === "-" && sql[i + 1] === "-") {
            let j = i;
            while (j < len && sql[j] !== "\n") j++;
            result += `<span style="color:#6B7280;font-style:italic">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Block comment
        if (sql[i] === "/" && sql[i + 1] === "*") {
            let j = i + 2;
            while (j < len - 1 && !(sql[j] === "*" && sql[j + 1] === "/")) j++;
            j += 2;
            result += `<span style="color:#6B7280;font-style:italic">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // String literal (single-quoted)
        if (sql[i] === "'") {
            let j = i + 1;
            while (j < len) {
                if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
                if (sql[j] === "'") { j++; break; }
                j++;
            }
            result += `<span style="color:#a3e635">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Dollar-quoted string: $$...$$
        if (sql[i] === "$" && sql[i + 1] === "$") {
            let j = i + 2;
            while (j < len - 1 && !(sql[j] === "$" && sql[j + 1] === "$")) j++;
            j += 2;
            result += `<span style="color:#a3e635">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Double-quoted identifier
        if (sql[i] === '"') {
            let j = i + 1;
            while (j < len && sql[j] !== '"') j++;
            j++;
            result += `<span style="color:#22d3ee">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Number literal
        if (/[0-9]/.test(sql[i]) || (sql[i] === "." && /[0-9]/.test(sql[i + 1] || ""))) {
            let j = i;
            while (j < len && /[0-9.]/.test(sql[j])) j++;
            result += `<span style="color:#fb923c">${esc(sql.slice(i, j))}</span>`;
            i = j;
            continue;
        }
        // Identifier or keyword
        if (/[a-zA-Z_]/.test(sql[i])) {
            let j = i;
            while (j < len && /[a-zA-Z0-9_]/.test(sql[j])) j++;
            const word = sql.slice(i, j);
            const up = word.toUpperCase();
            if (KEYWORDS.has(up)) {
                result += `<span style="color:#818cf8;font-weight:700">${esc(word)}</span>`;
            } else if (FUNCTIONS.has(up)) {
                result += `<span style="color:#22d3ee;font-weight:600">${esc(word)}</span>`;
            } else {
                result += `<span style="color:#e2e8f0">${esc(word)}</span>`;
            }
            i = j;
            continue;
        }
        // Operator / punctuation
        if (/[*=<>!+\-/%,;:.()]/.test(sql[i])) {
            result += `<span style="color:#f472b6">${esc(sql[i])}</span>`;
            i++;
            continue;
        }
        // Whitespace / other — preserve exactly
        result += esc(sql[i]);
        i++;
    }
    return result;
}

/* ── Component ─────────────────────────────────────────────── */
interface SQLEditorProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    disabled?: boolean;
    minHeight?: number;
}

export default function SQLEditor({
    value, onChange, placeholder, disabled, minHeight = 120,
}: SQLEditorProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);

    /* Keep mirror scroll in sync */
    const syncScroll = useCallback(() => {
        if (textareaRef.current && mirrorRef.current) {
            mirrorRef.current.scrollTop  = textareaRef.current.scrollTop;
            mirrorRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    /* Handle Tab key → insert 2 spaces */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Tab") {
            e.preventDefault();
            const el = e.currentTarget;
            const start = el.selectionStart;
            const end   = el.selectionEnd;
            const next  = value.slice(0, start) + "  " + value.slice(end);
            onChange(next);
            // Restore cursor after React re-render
            requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 2;
            });
        }
    };

    const sharedStyle: React.CSSProperties = {
        position: "absolute", inset: 0,
        margin: 0, padding: "14px 16px",
        fontFamily: "'Geist Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: "13px", lineHeight: 1.75,
        whiteSpace: "pre-wrap", wordBreak: "break-word",
        overflowWrap: "break-word",
        boxSizing: "border-box",
        border: "none", outline: "none",
        background: "transparent",
        resize: "none",
    };

    const highlighted = highlightSQL(value) + "\n"; // trailing \n to prevent last-line collapse

    return (
        <div style={{
            position: "relative", width: "100%",
            minHeight: `${minHeight}px`,
            background: "#080a12",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            transition: "border-color 0.15s",
        }}
            // focus-within glow via JS (CSS :focus-within not reachable with inline styles)
            onFocusCapture={e => (e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)")}
            onBlurCapture={e  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
        >
            {/* Syntax-highlighted mirror (behind the textarea) */}
            <div
                ref={mirrorRef}
                aria-hidden="true"
                style={{
                    ...sharedStyle,
                    color: "transparent",         // text itself is hidden; only spans show
                    pointerEvents: "none",
                    overflowY: "hidden",
                    overflowX: "hidden",
                    userSelect: "none",
                    zIndex: 0,
                    // Render the highlighted HTML
                } as React.CSSProperties}
                dangerouslySetInnerHTML={{ __html: highlighted }}
            />

            {/* Transparent editable textarea on top */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={syncScroll}
                disabled={disabled}
                placeholder={placeholder}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                style={{
                    ...sharedStyle,
                    color: "transparent",         // hide native text — mirror shows it
                    caretColor: "#c7d2fe",         // but keep the cursor visible
                    zIndex: 1,
                    overflowY: "auto",
                    minHeight: `${minHeight}px`,
                    cursor: disabled ? "not-allowed" : "text",
                    background: "transparent",
                }}
            />

            {/* Placeholder (shown when empty + not focused) */}
            {!value && placeholder && (
                <div style={{
                    ...sharedStyle,
                    color: "#374151",
                    pointerEvents: "none",
                    zIndex: 2,
                    position: "absolute",
                }}>
                    {placeholder}
                </div>
            )}
        </div>
    );
}
