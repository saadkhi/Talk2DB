// Simple in-memory rate limiter (upgrade to Redis for production)
interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60000; // Clean up expired entries every minute
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
    if (cleanupInterval) return;
    cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of rateLimitStore.entries()) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }, CLEANUP_INTERVAL);
}

startCleanup();

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
}

export function rateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60000 // Default: 10 requests per minute
): RateLimitResult {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || entry.resetTime < now) {
        // New window
        const newEntry: RateLimitEntry = {
            count: 1,
            resetTime: now + windowMs,
        };
        rateLimitStore.set(identifier, newEntry);
        return {
            success: true,
            limit,
            remaining: limit - 1,
            resetTime: newEntry.resetTime,
        };
    }

    // Existing window
    if (entry.count >= limit) {
        return {
            success: false,
            limit,
            remaining: 0,
            resetTime: entry.resetTime,
        };
    }

    entry.count++;
    return {
        success: true,
        limit,
        remaining: limit - entry.count,
        resetTime: entry.resetTime,
    };
}

// Helper to get identifier from request
// Accepts both Express Request (headers as object) and Web API Request (headers.get())
export function getIdentifier(req: any): string {
    // Express Request: req.headers is a plain object (string | string[] values)
    // Web API Request: req.headers has a .get() method
    let forwarded: string | null = null;
    if (typeof req.headers?.get === 'function') {
        forwarded = req.headers.get('x-forwarded-for');
    } else if (req.headers) {
        const val = req.headers['x-forwarded-for'];
        forwarded = Array.isArray(val) ? val[0] : (val ?? null);
    }
    return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
    // LLM-heavy endpoints - stricter limits
    query: { limit: 10, windowMs: 60000 }, // 10 per minute
    chat: { limit: 20, windowMs: 60000 }, // 20 per minute
    visualize: { limit: 10, windowMs: 60000 }, // 10 per minute
    report: { limit: 5, windowMs: 60000 }, // 5 per minute
    
    // Database operations
    schema: { limit: 30, windowMs: 60000 }, // 30 per minute
    profile: { limit: 20, windowMs: 60000 }, // 20 per minute
    
    // Auth endpoints
    auth: { limit: 5, windowMs: 60000 }, // 5 per minute
    connectDb: { limit: 3, windowMs: 300000 }, // 3 per 5 minutes
} as const;
