export interface FriendlyError {
    message: string;
    friendlyMessage: string;
    code?: string;
    severity?: string;
    suggestion?: string;
}

export function formatDatabaseError(err: any): FriendlyError {
    const rawMessage = err?.message || String(err || "Unknown database error");
    const code = String(err?.code || "");
    const severity = String(err?.severity || "");

    const friendly: FriendlyError = {
        message: rawMessage,
        friendlyMessage: "An unexpected database error occurred.",
        code,
        severity,
        suggestion: "Please try again, or check your database settings."
    };

    // 1. Connection & Network errors
    if (code === "ENOTFOUND" || rawMessage.includes("ENOTFOUND")) {
        friendly.friendlyMessage = "Database host connection failed. The server name could not be resolved.";
        friendly.suggestion = "Verify that the database host name in your URI is spelled correctly and that the endpoint is online.";
        return friendly;
    }

    if (code === "ECONNREFUSED" || rawMessage.includes("ECONNREFUSED")) {
        friendly.friendlyMessage = "Connection refused by the database server.";
        friendly.suggestion = "Check that the database server is running, the port number is correct, and that firewalls/security rules allow connections from your server.";
        return friendly;
    }

    if (code === "ETIMEDOUT" || rawMessage.includes("ETIMEDOUT") || rawMessage.includes("timeout") || rawMessage.includes("timed out")) {
        friendly.friendlyMessage = "Database connection timed out. The server took too long to respond.";
        friendly.suggestion = "Ensure your database server is active and not overloaded, and check that the network latency/connection is stable.";
        return friendly;
    }

    // 2. Authentication & Authorization errors
    if (code === "28P01" || rawMessage.includes("password authentication failed") || rawMessage.includes("auth-failed")) {
        friendly.friendlyMessage = "Database authentication failed (incorrect login credentials).";
        friendly.suggestion = "Double-check that your database username and password in the connection string are completely correct.";
        return friendly;
    }

    if (code === "28000" || rawMessage.includes("invalid authorization specification")) {
        friendly.friendlyMessage = "The database user is not authorized or is invalid.";
        friendly.suggestion = "Verify that the database user specified in your connection string actually exists and is permitted to connect.";
        return friendly;
    }

    // 3. Namespace & Schema errors
    if (code === "3D000" || rawMessage.includes("database") && rawMessage.includes("does not exist")) {
        // Extract database name if present
        const dbNameMatch = rawMessage.match(/database "([^"]+)" does not exist/);
        const dbName = dbNameMatch ? ` "${dbNameMatch[1]}"` : "";
        friendly.friendlyMessage = `The specified database${dbName} does not exist.`;
        friendly.suggestion = "Create the database first, or clarify that the database name in your connection string is accurate.";
        return friendly;
    }

    // 4. SQL execution errors the user triggers
    if (code === "42703" || rawMessage.includes("column") && rawMessage.includes("does not exist")) {
        const colNameMatch = rawMessage.match(/column "([^"]+)" of relation "([^"]+)" does not exist/);
        const colExplain = colNameMatch
            ? `Column "${colNameMatch[1]}" was not found on table "${colNameMatch[2]}"`
            : "One of the columns requested in the query does not exist";
        friendly.friendlyMessage = `${colExplain}.`;
        friendly.suggestion = "Verify field and column spellings, check recent DB migrations, or refer to the Schema Explorer tab to verify table metadata fields.";
        return friendly;
    }

    if (code === "42P01" || rawMessage.includes("relation") && rawMessage.includes("does not exist")) {
        const tableNameMatch = rawMessage.match(/relation "([^"]+)" does not exist/);
        const tableName = tableNameMatch ? ` "${tableNameMatch[1]}"` : "";
        friendly.friendlyMessage = `Table${tableName} was not found in the database.`;
        friendly.friendlyMessage += " This usually happens when the SQL model generates queries on incorrect or non-existent tables.";
        friendly.suggestion = `Ensure the table exists. Double-check your database structure, or view the columns using the Schema Explorer page to suggest columns correctly.`;
        return friendly;
    }

    if (code === "42601" || rawMessage.includes("syntax error")) {
        friendly.friendlyMessage = "Your query contains an SQL syntax error.";
        friendly.suggestion = "Check that keywords (SELECT, FROM, WHERE), parentheses, commas, quotes, and query structures conform to standard PostgreSQL syntax rules.";
        return friendly;
    }

    // SSL errors
    if (rawMessage.includes("self-signed certificate")) {
        friendly.friendlyMessage = "SSL connection failed because of a self-signed certificate.";
        friendly.suggestion = "Ensure your SSL configuration allows rejecting unauthorized (self-signed) certificates. (Next.js config has been preset to securely bypass standard self-signed alarms on local neon platforms).";
        return friendly;
    }

    // Fallbacks based on common strings
    if (rawMessage.includes("SSL")) {
        friendly.friendlyMessage = "Database SSL handshake connection failed.";
        friendly.suggestion = "Ensure your database server is configured to accept SSL connections, and that your connection URI has the correct SSL parameters.";
        return friendly;
    }

    // Generic fallback mapping
    return friendly;
}
