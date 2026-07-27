// Strict SQL validation - only allow SELECT queries with safe clauses

const ALLOWED_KEYWORDS = [
    // Core DML (read-only)
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'CROSS', 'FULL',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'ILIKE', 'BETWEEN', 'EXISTS',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'FETCH', 'FIRST', 'ROWS', 'ONLY',
    'DISTINCT', 'AS', 'WITH', 'RECURSIVE',
    // Flow control
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'NULLS', 'LAST',
    // Aggregate functions
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ARRAY_AGG', 'STRING_AGG', 'JSON_AGG',
    'JSON_OBJECT_AGG', 'BOOL_AND', 'BOOL_OR', 'EVERY',
    // Window functions
    'OVER', 'PARTITION', 'WINDOW', 'RANGE', 'ROWS', 'UNBOUNDED', 'PRECEDING',
    'FOLLOWING', 'CURRENT', 'ROW',
    'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'PERCENT_RANK', 'CUME_DIST',
    'NTILE', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE',
    // Scalar / conversion functions
    'COALESCE', 'NULLIF', 'CAST', 'CONVERT', 'TO_CHAR', 'TO_DATE', 'TO_TIMESTAMP',
    'TO_NUMBER', 'GREATEST', 'LEAST',
    // String functions
    'UPPER', 'LOWER', 'LENGTH', 'CHAR_LENGTH', 'TRIM', 'LTRIM', 'RTRIM', 'BTRIM',
    'LPAD', 'RPAD', 'CONCAT', 'CONCAT_WS', 'SUBSTRING', 'SUBSTR', 'LEFT', 'RIGHT',
    'POSITION', 'STRPOS', 'REPLACE', 'REGEXP_REPLACE', 'REGEXP_MATCH',
    'REGEXP_MATCHES', 'SPLIT_PART', 'INITCAP', 'REPEAT', 'REVERSE', 'MD5',
    // Math functions
    'ROUND', 'FLOOR', 'CEIL', 'CEILING', 'ABS', 'MOD', 'POWER', 'SQRT', 'TRUNC',
    'SIGN', 'RANDOM', 'LOG', 'LN', 'EXP',
    // Date/time functions
    'EXTRACT', 'DATE_TRUNC', 'DATE_PART', 'NOW', 'CURRENT_DATE', 'CURRENT_TIME',
    'CURRENT_TIMESTAMP', 'LOCALTIME', 'LOCALTIMESTAMP', 'AGE', 'MAKE_DATE',
    'MAKE_INTERVAL', 'MAKE_TIMESTAMP', 'MAKE_TIMESTAMPTZ', 'CLOCK_TIMESTAMP',
    'DATE', 'INTERVAL', 'TIME', 'TIMESTAMP', 'TIMESTAMPTZ',
    // Type names used in CAST(x AS type)
    'INTEGER', 'INT', 'BIGINT', 'SMALLINT', 'NUMERIC', 'DECIMAL', 'FLOAT',
    'DOUBLE', 'PRECISION', 'REAL', 'BOOLEAN', 'BOOL', 'TEXT', 'VARCHAR',
    'CHAR', 'CHARACTER', 'VARYING', 'BYTEA', 'UUID', 'JSON', 'JSONB',
    'OID', 'SERIAL', 'BIGSERIAL',
    // Set operations
    'UNION', 'ALL', 'INTERSECT', 'EXCEPT',
    // Literals
    'TRUE', 'FALSE', 'UNKNOWN',
    // FILTER clause (for aggregate filters)
    'FILTER',
    // Lateral joins
    'LATERAL',
    // VALUES (used in subquery contexts like SELECT * FROM (VALUES ...) t)
    'VALUES',
];

// Known dangerous PostgreSQL built-ins that must never be allowed.
// These can read files, list directories, make network connections, etc.
const BLOCKED_FUNCTION_PATTERNS = [
    /\bpg_read_file\b/i,
    /\bpg_read_binary_file\b/i,
    /\bpg_ls_dir\b/i,
    /\bpg_stat_file\b/i,
    /\bpg_sleep\b/i,       // timing attack
    /\blo_import\b/i,
    /\blo_export\b/i,
    /\bcopy\b\s*\(/i,       // COPY as a function call
    /\bdblink\b/i,
    /\bdblink_exec\b/i,
    /\bdblink_connect\b/i,
    /\bfile_fdw\b/i,
    /\bpg_execute_server_program\b/i,
    /\bpg_reload_conf\b/i,
    /\bcurrent_setting\s*\(/i,
    /\bset_config\s*\(/i,
];

const BLOCKED_PATTERNS = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE|EXEC|EXECUTE)/i,
    /--/,                      // SQL line comments
    /\/\*[\s\S]*?\*\//,        // Block comments
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i, // Chained statements
    /\b(?:xp_|sp_)\w+\s*\(/i, // SQL Server stored procedures
    /;\s*WAITFOR\s+DELAY/i,    // SQL Server timing attack
    /;\s*BENCHMARK\s*\(/i,     // MySQL timing attack
];

export function isSQLSafe(sql: string): boolean {
    // Normalise: trim whitespace and strip a single trailing semicolon.
    // A lone trailing semicolon is harmless and commonly added by LLMs / users,
    // but multiple statements separated by semicolons are still blocked below.
    const normalised = sql.trim().replace(/;\s*$/, "");

    const upper = normalised.toUpperCase();

    // Must start with SELECT (or WITH for CTEs that lead to a SELECT)
    if (!upper.startsWith("SELECT") && !upper.startsWith("WITH")) {
        return false;
    }

    // Block dangerous built-in function calls
    for (const pattern of BLOCKED_FUNCTION_PATTERNS) {
        if (pattern.test(normalised)) {
            return false;
        }
    }

    // Check for blocked patterns (statement chaining, comments, timing attacks, etc.)
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(normalised)) {
            return false;
        }
    }

    // Reject any remaining semicolons (multi-statement chaining)
    if (normalised.includes(";")) {
        return false;
    }

    // Keyword/identifier allowlist — every \w+ token must be a known keyword,
    // a valid identifier, or a numeric literal.
    const words = upper.match(/\b\w+\b/g) || [];
    for (const word of words) {
        if (ALLOWED_KEYWORDS.includes(word)) continue;
        // Allow table/column identifiers (letter or underscore start)
        if (/^[A-Z_][A-Z0-9_]*$/.test(word)) continue;
        // Allow numeric literals
        if (/^\d+$/.test(word)) continue;
        return false;
    }

    return true;
}

export function extractSQL(llmOutput: string): string {
    // Extract SQL from markdown code blocks if present
    const codeBlockMatch =
        llmOutput.match(/```sql\n?([\s\S]*?)```/i) ||
        llmOutput.match(/```\n?([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    // Otherwise return as-is, cleaned
    return llmOutput.trim();
}
