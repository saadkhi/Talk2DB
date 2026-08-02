import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { queryHandler } from './routes/query';
import { chatHandler } from './routes/chat';

dotenv.config();

const app = express();
const port = process.env.PORT || 8000;
const prisma = new PrismaClient();

// ── CORS allowlist ─────────────────────────────────────────────────────────────
// origin:true reflects every caller's origin with credentials=true, which is
// equivalent to Access-Control-Allow-Origin: * with credentials — any site
// could make authenticated requests to this server.  We use an explicit list.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow server-to-server calls (no Origin header) and listed origins
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error(`CORS: origin '${origin}' is not allowed`));
            }
        },
        credentials: true,
    })
);

app.use(express.json());

// ── CSRF — Origin / Referer check for all state-mutating routes (task 1.5) ───
//
// This middleware runs after CORS so browsers have already been refused via
// preflight for cross-origin origins.  The Origin check here is a defence-in-
// depth guard that also catches non-browser clients that skip CORS (e.g. curl
// sent with a forged Cookie) as long as they send an Origin header.
//
// Strategy:
//  1. If the request has no Origin header, check Referer instead.
//  2. If neither header is present (same-origin server-to-server call from the
//     Next.js backend) we let the request through — it has no cookie to steal.
//  3. Any Origin / Referer that doesn't match the allowlist is rejected 403.
//
function csrfCheck(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): void {
    const origin = req.headers["origin"] as string | undefined;
    const referer = req.headers["referer"] as string | undefined;

    // Determine the effective source
    const source = origin ?? (referer ? new URL(referer).origin : null);

    if (!source) {
        // No browser origin headers — allow (server-to-server)
        next();
        return;
    }

    if (ALLOWED_ORIGINS.includes(source)) {
        next();
        return;
    }

    res.status(403).json({ error: "Forbidden: cross-site request rejected" });
}

// ── Auth middleware ────────────────────────────────────────────────────────────
async function authMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
): Promise<void> {
    try {
        const token = await getToken({
            req: req as any,
            secret: process.env.NEXTAUTH_SECRET,
        });
        if (token && token.id) {
            (req as any).userId = token.id;
            next();
        } else {
            console.log("No token or id found for auth");
            res.status(401).json({ error: "Unauthorized" });
        }
    } catch (e) {
        console.error("Auth middleware error", e);
        res.status(401).json({ error: "Unauthorized" });
    }
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// csrfCheck runs before authMiddleware so malformed cross-site requests are
// rejected before we spend cycles verifying JWT tokens.
app.post('/api/query', csrfCheck, authMiddleware, queryHandler);
app.post('/api/chat',  csrfCheck, authMiddleware, chatHandler);

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
