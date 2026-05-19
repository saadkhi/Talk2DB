const BLOCKED_KEYWORDS = [
    /\bDROP\b/i, /\bDELETE\b/i, /\bTRUNCATE\b/i,
    /\bALTER\b/i, /\bCREATE\b/i, /\bINSERT\b/i,
    /\bUPDATE\b/i, /\bGRANT\b/i, /\bREVOKE\b/i,
    /\bEXEC\b/i, /\bEXECUTE\b/i,
];

export function isSQLSafe(sql: string): boolean {
    return !BLOCKED_KEYWORDS.some(pattern => pattern.test(sql));
}

export function extractSQL(llmOutput: string): string {
    // Extract SQL from markdown code blocks if present
    const codeBlockMatch = llmOutput.match(/```sql\n?([\s\S]*?)```/i) ||
        llmOutput.match(/```\n?([\s\S]*?)```/);
    if (codeBlockMatch) return codeBlockMatch[1].trim();
    // Otherwise return as-is, cleaned
    return llmOutput.trim();
}
