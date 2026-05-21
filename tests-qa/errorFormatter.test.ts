/**
 * @file errorFormatter.test.ts
 * @description Comprehensive automated QA unit test suite for Talk2DB Database Error Parser & Formatter.
 * @total_test_cases 15
 */

import { formatDatabaseError } from "../sql-chat-app/nextjs-app/src/lib/errorFormatter";

describe("Talk2DB Database Error Parser & Formatter Suite (15 Test Cases)", () => {

    // =========================================================================
    // SECTION 1: NETWORK & SOCKET EXCEPTION TESTS (TC-086 to TC-090)
    // =========================================================================

    it("TC-086: Should format ENOTFOUND Host Connection failure into simple resolved suggestion", () => {
        const mockError = { code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND ep-soft-scene.aws" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("Database host connection failed");
        expect(result.suggestion).toContain("Verify that the database host name");
    });

    it("TC-087: Should format ECONNREFUSED Socket errors into clean instructions warning", () => {
        const mockError = { code: "ECONNREFUSED", message: "connect ECONNREFUSED 127.0.0.1:5432" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("Connection refused by the database server");
        expect(result.suggestion).toContain("Check that the database server is running");
    });

    it("TC-088: Should format ETIMEDOUT network timeout errors gracefully", () => {
        const mockError = { code: "ETIMEDOUT", message: "connection timeout exceeded" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("Database connection timed out");
        expect(result.suggestion).toContain("Ensure your database server is active");
    });

    it("TC-089: Should format string-based query timeout alerts safely using falling regex matches", () => {
        const mockError = new Error("Operational connection timed out hanging query");
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("Database connection timed out");
    });

    it("TC-090: Should parse host unreachability networks code EHOSTUNREACH", () => {
        const mockError = { code: "EHOSTUNREACH", message: "No route to host" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toBeDefined();
    });

    // =========================================================================
    // SECTION 2: AUTHENTICATION & SCHEMA CONFIG SHORTCUTS (TC-091 to TC-095)
    // =========================================================================

    it("TC-091: Should format password authentication failure code 28P01", () => {
        const mockError = { code: "28P01", message: "password authentication failed for user 'saad'" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("authentication failed");
        expect(result.suggestion).toContain("username and password");
    });

    it("TC-092: Should format invalid authorization status code 28000", () => {
        const mockError = { code: "28000", message: "invalid authorization specification" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("user is not authorized");
        expect(result.suggestion).toContain("database user specified");
    });

    it("TC-093: Should format database does not exist code 3D000 with matched name", () => {
        const mockError = { code: "3D000", message: "database \"wrong_db\" does not exist" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("wrong_db");
        expect(result.suggestion).toContain("Create the database first");
    });

    it("TC-094: Should format SSL self-signed certificates errors gracefully", () => {
        const mockError = new Error("self-signed certificate in certificate chain");
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("SSL connection failed because of a self-signed certificate");
        expect(result.suggestion).toContain("local neon platforms");
    });

    it("TC-095: Should parse generic SSL handshake connection issues", () => {
        const mockError = new Error("SSL connection broke during hello exchange");
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("Database SSL handshake");
    });

    // =========================================================================
    // SECTION 3: USER SQL QUERY SYNTAX ERRORS (TC-096 to TC-100)
    // =========================================================================

    it("TC-096: Should format undefined table relation code 42P01 and show table name", () => {
        const mockError = { code: "42P01", message: "relation \"missing_table\" does not exist" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("missing_table");
        expect(result.friendlyMessage).toContain("not found in the database");
        expect(result.suggestion).toContain("Schema Explorer");
    });

    it("TC-097: Should format undefined columns code 42703 and isolate field description", () => {
        const mockError = { code: "42703", message: "column \"no_col\" of relation \"users\" does not exist" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("no_col");
        expect(result.friendlyMessage).toContain("users");
        expect(result.suggestion).toContain("Verify field and column spellings");
    });

    it("TC-098: Should format standard compiler SQL syntax error code 42601", () => {
        const mockError = { code: "42601", message: "syntax error at or near \"FROM\"" };
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toContain("SQL syntax error");
        expect(result.suggestion).toContain("parentheses, commas, quotes");
    });

    it("TC-099: Should return generic fallback description for completely untyped exceptions", () => {
        const mockError = {};
        const result = formatDatabaseError(mockError);
        expect(result.friendlyMessage).toEqual("An unexpected database error occurred.");
    });

    it("TC-100: Should return raw error message string internally inside diagnostics payload", () => {
        const mockError = new Error("My unique custom engine crash");
        const result = formatDatabaseError(mockError);
        expect(result.message).toEqual("My unique custom engine crash");
    });
});
