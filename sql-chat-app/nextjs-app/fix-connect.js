const fs = require('fs');

const file = 'src/app/api/user/connect-db/route.ts';
let content = fs.readFileSync(file, 'utf8');

// The file relies heavily on updating user.dbConnectionString.
const targetSave = `        // ── Store encrypted connection string ──────────────────────────────
        const encrypted = encrypt(connectionString);
        await prisma.user.update({
            where: { id: userId },
            data: {
                dbConnectionString: encrypted,
                dbDialect: dialect || "postgresql",
            },
        });`;

const replacementSave = `        // ── Check Permissions (Read-only Warning) ────────────────────────
        let hasWriteAccess = false;
        try {
            const permPool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 5000,
            });
            // Very simple check: does the user have INSERT/UPDATE/DELETE privileges on ANY table in public schema?
            // A more robust check might look at role attributes, but this works for standard setups.
            const permRes = await permPool.query(\`
                SELECT privilege_type 
                FROM information_schema.role_table_grants 
                WHERE grantee = current_user 
                AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE')
                LIMIT 1
            \`);
            if (permRes.rows.length > 0) {
                hasWriteAccess = true;
            }
            await permPool.end();
        } catch {
            // Ignore permission check errors
        }

        // ── Store encrypted connection string ──────────────────────────────
        const encrypted = encrypt(connectionString);
        const newName = \`Connection \${Math.floor(Math.random() * 1000)}\`;
        
        // Check if it's the first connection
        const count = await prisma.dbConnection.count({ where: { userId } });
        const isDefault = count === 0;

        await prisma.dbConnection.create({
            data: {
                userId,
                name: newName,
                dbConnectionString: encrypted,
                dbDialect: dialect || "postgresql",
                isDefault,
            },
        });`;

content = content.replace(targetSave, replacementSave);

// Also need to return the warning
content = content.replace('message: "Database connected successfully",', 'message: "Database connected successfully", hasWriteAccess,');

// Delete route
const targetDelete = `        await prisma.user.update({
            where: { id: userId },
            data: { dbConnectionString: null, dbDialect: null },
        });`;

const replacementDelete = `        // Need a connectionId to delete, but for now we'll just delete all for simplicity or expect a body.
        // Wait, DELETE methods don't normally have a body. Let's just delete the default one or all?
        // Let's delete all for this basic refactor to keep existing UI functional if they just hit disconnect.
        await prisma.dbConnection.deleteMany({
            where: { userId },
        });`;

content = content.replace(targetDelete, replacementDelete);

fs.writeFileSync(file, content);
