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
export function getIdentifier(req: Request): string {
    // Try to get from session/user ID if authenticated
    // For now, use IP address (upgrade to session-based in production)
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    return ip;
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
