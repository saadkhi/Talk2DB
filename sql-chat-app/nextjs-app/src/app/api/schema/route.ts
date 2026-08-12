import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { resolveUserWithDb } from "@/lib/resolveUser";
import { getEnrichedSchema } from "@/lib/schemaContext";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await resolveUserWithDb(session);

        if (!user) {
            return NextResponse.json(
                { error: "Account not found. Please sign out and sign back in." },
                { status: 401 }
            );
        }
        if (!user.dbConnectionString) {
            return NextResponse.json(
                { error: "No DB connected. Click the 'Not Connected' button to add your database." },
                { status: 400 }
            );
        }

        const schema = await getEnrichedSchema(user.dbConnectionString);

        // Return in the format the frontend expects: { tables: [...] }
        return NextResponse.json({
            tables: schema.tables.map(t => ({
                name: t.name,
                rowCount: t.rowCount,
                columns: t.columns,
            })),
            relationships: schema.relationships,
        });
    } catch (error: any) {
        if (process.env.NODE_ENV !== "production") {
            console.error("Schema introspection error:", error);
        }
        return NextResponse.json(
            { error: error.message || "Failed to introspect schema" },
            { status: 500 }
        );
    }
}

// Re-export getSchema for any routes that import it directly
export { getEnrichedSchema as getSchema };
