// Strict SQL validation - only allow SELECT queries with safe clauses
const ALLOWED_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
    'ON', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'DISTINCT',
    'AS', 'WITH', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ARRAY_AGG', 'STRING_AGG',
    'COALESCE', 'NULLIF', 'CAST', 'EXTRACT', 'DATE_TRUNC', 'NOW',
    'TRUE', 'FALSE', 'UNION', 'ALL', 'INTERSECT', 'EXCEPT'
];

const BLOCKED_PATTERNS = [
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|GRANT|REVOKE|EXEC|EXECUTE)/i,
    /--.*$/m,  // SQL comments
    /\/\*[\s\S]*?\*\//,  // Multi-line comments
    /;\s*(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE)/i,  // Chained statements
    /\b(?:xp_|sp_)\w+\(/i,  // Stored procedures
    /;\s*WAITFOR\s+DELAY/i,  // Timing attacks
    /;\s*pg_sleep\(/i,  // PostgreSQL timing attacks
    /;\s*BENCHMARK\(/i,  // MySQL timing attacks
];

export function isSQLSafe(sql: string): boolean {
    const trimmed = sql.trim().toUpperCase();
    
    // Must start with SELECT
    if (!trimmed.startsWith('SELECT')) {
        return false;
    }
    
    // Check for blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(sql)) {
            return false;
        }
    }
    
    // Check for semicolons (potential statement chaining)
    if (sql.includes(';')) {
        return false;
    }
    
    // Only allow known safe keywords
    const words = trimmed.match(/\b\w+\b/g) || [];
    for (const word of words) {
        if (!ALLOWED_KEYWORDS.includes(word)) {
            // Allow table/column names (alphanumeric with underscores)
            if (!/^[A-Z_][A-Z0-9_]*$/.test(word)) {
                return false;
            }
        }
    }
    
    return true;
}

export function extractSQL(llmOutput: string): string {
    // Extract SQL from markdown code blocks if present
    const codeBlockMatch = llmOutput.match(/```sql\n?([\s\S]*?)```/i) ||
        llmOutput.match(/```\n?([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    // Otherwise return as-is, cleaned
    return llmOutput.trim();
}
