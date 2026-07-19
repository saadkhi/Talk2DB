/**
 * Cleans up a PostgreSQL connection string that the user may have pasted
 * in various formats:
 *
 *   1. Raw URL:       postgresql://user:pass@host/db
 *   2. psql command:  psql 'postgresql://user:pass@host/db'
 *   3. Quoted:        "postgresql://user:pass@host/db"
 *   4. With options:  postgresql://...?sslmode=require&channel_binding=require
 *
 * Returns the cleaned URL string, or throws with a user-readable message
 * when the input cannot be parsed into a valid postgres URL.
 */
export function sanitizeConnectionString(raw: string): string {
    let s = raw.trim();

    // Strip leading `psql ` or `psql\t` command prefix (case-insensitive)
    if (/^psql\s/i.test(s)) {
        // Extract the first postgresql:// or postgres:// URL from the string
        const match = s.match(/(?:postgresql|postgres):\/\/[^\s'"`]+/i);
        if (match) {
            s = match[0];
        } else {
            throw new Error(
                "Could not extract a connection URL from the psql command. " +
                "Please paste just the URL, e.g. postgresql://user:pass@host/db"
            );
        }
    }

    // Recursively strip wrapping quote characters (', ", `)
    // Neon and Supabase sometimes show the URL wrapped in single quotes
    for (let i = 0; i < 5; i++) {
        if (
            (s.startsWith("'")  && s.endsWith("'")) ||
            (s.startsWith('"')  && s.endsWith('"')) ||
            (s.startsWith("`")  && s.endsWith("`"))
        ) {
            s = s.slice(1, -1).trim();
        } else {
            break;
        }
    }

    // Final validation
    if (!s.startsWith("postgresql://") && !s.startsWith("postgres://")) {
        throw new Error(
            "Invalid connection string — it must start with postgresql:// or postgres://. " +
            "Copy the connection string from your database provider's dashboard."
        );
    }

    return s;
}
