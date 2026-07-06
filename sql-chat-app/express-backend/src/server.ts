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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Auth middleware reading NextAuth session tokens
async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    try {
        const token = await getToken({
            req: req as any,
            secret: process.env.NEXTAUTH_SECRET
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

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Heavies
app.post('/api/query', authMiddleware, queryHandler);
app.post('/api/chat', authMiddleware, chatHandler);

app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
});
