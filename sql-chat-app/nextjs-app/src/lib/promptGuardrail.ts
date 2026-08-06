/**
 * promptGuardrail.ts
 *
 * Fast, lightweight check that rejects prompts that are clearly unrelated
 * to databases, SQL, or data analysis — without an LLM call.
 *
 * Strategy: keyword + pattern blocklist on lowercased input.
 * Allowlist of strong DB signals always passes through.
 *
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */

export interface GuardrailResult {
    allowed: boolean;
    reason?: string;
}

/* ── Strong DB/data-analysis signals — always allow ───────────────────── */
const DB_SIGNALS = [
    // SQL keywords
    "select", "from", "where", "join", "group by", "order by", "having",
    "insert", "update", "delete", "create table", "alter table", "drop table",
    "index", "foreign key", "primary key", "constraint",
    // Data concepts
    "table", "column", "row", "schema", "database", "query", "sql",
    "postgres", "postgresql", "mysql", "sqlite", "mongodb",
    "data", "dataset", "dataframe", "record", "field", "aggregate",
    "count", "sum", "avg", "average", "max", "min", "total",
    "revenue", "sales", "orders", "customers", "products", "employees",
    "report", "chart", "visualization", "dashboard", "analytics",
    "profil", "null", "duplicate", "distinct", "join",
];

/* ── Off-topic signals — reject if found without DB context ───────────── */
const BLOCKED_PATTERNS: RegExp[] = [
    // General knowledge / chat
    /\b(write\s+(me\s+)?(a\s+)?(poem|story|essay|song|rap|haiku|limerick|lyrics))/i,
    /\b(tell\s+me\s+(a\s+)?joke)/i,
    /\b(what\s+is\s+the\s+(meaning|purpose)\s+of\s+life)/i,
    /\bwho\s+(is|was|are)\s+[a-z]+\s+(actor|singer|president|politician|celebrity)/i,
    /\b(recipe|cooking|baking|ingredient)/i,
    /\b(movie|film|tv\s+show|series|episode|season)\s+(review|recommendation|plot)/i,
    /\b(weather|forecast|temperature)\s+(in|for|at|today|tomorrow)/i,
    /\b(stock\s+price|crypto(currency)?|bitcoin|ethereum)\s+(price|value|prediction)/i,
    /\b(write\s+(code|program|script)\s+in\s+(python|javascript|java|c\+\+|ruby|go|rust)(?!\s+sql))/i,
    /\b(translate\s+(this\s+)?(to|into|from)\s+[a-z]+)/i,
    /\b(horoscope|zodiac|astrology)/i,
    /\b(relationship\s+advice|dating\s+tips)/i,
    /\b(what\s+should\s+i\s+(eat|wear|buy|watch))/i,
    /\b(game\s+(walkthrough|cheat|tip|trick))/i,
];

/**
 * Checks if the prompt is DB/data-related.
 * Call this in API routes BEFORE hitting the LLM.
 */
export function checkPromptGuardrail(prompt: string): GuardrailResult {
    if (!prompt || prompt.trim().length < 3) {
        return { allowed: false, reason: "Prompt is too short." };
    }

    const lower = prompt.toLowerCase();

    // If any strong DB signal exists → always allow
    if (DB_SIGNALS.some(sig => lower.includes(sig))) {
        return { allowed: true };
    }

    // Check blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(lower)) {
            return {
                allowed: false,
                reason:
                    "Talk2DB only assists with database queries, SQL, and data analysis. " +
                    "Please ask a question related to your data or database.",
            };
        }
    }

    // For short prompts with no DB signal and no obvious block — be lenient
    // (user might just type a table name like "employees")
    if (prompt.trim().length <= 60) {
        return { allowed: true };
    }

    // Longer prompts with no DB signal at all → soft reject
    // Count alphanumeric words — if the prompt has no numbers/db-like terms,
    // it's probably off-topic
    const wordCount = lower.split(/\s+/).length;
    const hasNumbers = /\d/.test(lower);
    const hasSpecialChars = /[*()=<>%]/.test(lower);

    if (wordCount > 12 && !hasNumbers && !hasSpecialChars) {
        // Final heuristic: does the prompt contain ANY data-adjacent nouns?
        const weakDbSignals = [
            "list", "show", "find", "get", "fetch", "display", "what", "how many",
            "which", "top", "bottom", "latest", "oldest", "recent", "compare",
            "between", "range", "filter", "sort", "group", "trend", "analysis",
            "insight", "metric", "statistic", "breakdown", "summary",
        ];
        if (!weakDbSignals.some(s => lower.includes(s))) {
            return {
                allowed: false,
                reason:
                    "Talk2DB only assists with database queries, SQL, and data analysis. " +
                    "Please ask a question related to your data or database.",
            };
        }
    }

    return { allowed: true };
}
