/**
 * Rate limiting via Upstash Redis (@upstash/ratelimit).
 *
 * Requires these env vars:
 *   UPSTASH_REDIS_REST_URL  — REST URL from your Upstash Redis console
 *   UPSTASH_REDIS_REST_TOKEN — REST token from your Upstash Redis console
 *
 * When those vars are absent (local dev without Redis) the module falls back to
 * a lightweight in-memory implementation so the server still starts and works.
 *
 * Key strategy (task 1.2):
 *   - Authenticated requests are keyed by userId  (accurate per-user limits)
 *   - Unauthenticated requests fall back to client IP  (reasonable default)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Upstash Redis client (lazy, only created when env vars are present) ──────

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
    if (redisClient) return redisClient;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    redisClient = new Redis({ url, token });
    return redisClient;
}

// ── Rate limit configurations ─────────────────────────────────────────────────

export const RATE_LIMITS = {
    // LLM-heavy endpoints — stricter limits
    query:      { limit: 10, windowMs: 60_000 }, // 10 per minute
    chat:       { limit: 20, windowMs: 60_000 }, // 20 per minute
    visualize:  { limit: 10, windowMs: 60_000 }, // 10 per minute
    report:     { limit: 5,  windowMs: 60_000 }, // 5 per minute

    // Database operations
    schema:     { limit: 30, windowMs: 60_000 }, // 30 per minute
    profile:    { limit: 20, windowMs: 60_000 }, // 20 per minute

    // Auth endpoints
    auth:       { limit: 5,  windowMs: 60_000 },   // 5 per minute
    connectDb:  { limit: 3,  windowMs: 300_000 },  // 3 per 5 minutes
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

// ── Shared result type ────────────────────────────────────────────────────────

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
}

// ── In-memory fallback (dev / no Redis) ──────────────────────────────────────

interface MemEntry { count: number; resetTime: number }
const memStore = new Map<string, MemEntry>();

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memStore.entries()) {
        if (entry.resetTime < now) memStore.delete(key);
    }
}, 60_000);

function memRateLimit(identifier: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = memStore.get(identifier);

    if (!entry || entry.resetTime < now) {
        const newEntry: MemEntry = { count: 1, resetTime: now + windowMs };
        memStore.set(identifier, newEntry);
        return { success: true, limit, remaining: limit - 1, resetTime: newEntry.resetTime };
    }

    if (entry.count >= limit) {
        return { success: false, limit, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { success: true, limit, remaining: limit - entry.count, resetTime: entry.resetTime };
}

// ── Upstash-backed limiter cache (one Ratelimit instance per endpoint config) ─

const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
    const cacheKey = `${limit}:${windowMs}`;
    if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!;

    const redis = getRedis()!; // only called when redis is available
    const windowSeconds = Math.ceil(windowMs / 1000);

    const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        analytics: false,
        prefix: "talk2db:rl",
    });

    limiterCache.set(cacheKey, limiter);
    return limiter;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Check and record a rate-limit hit.
 *
 * @param identifier  User ID (preferred) or client IP (fallback).
 * @param limit       Max requests in the window.
 * @param windowMs    Window size in milliseconds.
 */
export async function rateLimit(
    identifier: string,
    limit: number = 10,
    windowMs: number = 60_000
): Promise<RateLimitResult> {
    const redis = getRedis();

    // No Redis configured — use in-memory fallback
    if (!redis) {
        if (process.env.NODE_ENV !== "production") {
            // Warn once per process to avoid log spam
            if (!(global as any).__rlWarnedOnce) {
                (global as any).__rlWarnedOnce = true;
                console.warn(
                    "[rateLimit] UPSTASH_REDIS_REST_URL / TOKEN not set — using in-memory fallback. " +
                    "Set these vars in production."
                );
            }
        }
        return memRateLimit(identifier, limit, windowMs);
    }

    const limiter = getLimiter(limit, windowMs);
    const response = await limiter.limit(identifier);

    return {
        success: response.success,
        limit: response.limit,
        remaining: response.remaining,
        resetTime: response.reset,
    };
}

// ── Identifier extraction ─────────────────────────────────────────────────────

/**
 * Build a rate-limit identifier from a request.
 *
 * Priority:
 *   1. userId attached by auth middleware  (task 1.2 — per-user when authenticated)
 *   2. X-Forwarded-For header              (behind reverse proxy)
 *   3. req.ip / req.socket.remoteAddress   (direct connection)
 *   4. "unknown"                           (last resort)
 *
 * Accepts both Express Request objects and Web API Request objects.
 */
export function getIdentifier(req: any, userId?: string): string {
    // Prefer authenticated user ID — most accurate and abuse-resistant
    if (userId) return `user:${userId}`;

    // Also check if auth middleware already attached it
    if (req.userId) return `user:${req.userId}`;

    // Fall back to IP
    let ip: string | null = null;

    if (typeof req.headers?.get === "function") {
        // Web API Request
        const forwarded = req.headers.get("x-forwarded-for");
        ip = forwarded ? forwarded.split(",")[0].trim() : null;
    } else if (req.headers) {
        // Express Request
        const forwarded = req.headers["x-forwarded-for"];
        const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        ip = raw ? raw.split(",")[0].trim() : null;
    }

    if (!ip && req.ip) ip = req.ip;
    if (!ip && req.socket?.remoteAddress) ip = req.socket.remoteAddress;

    return ip ? `ip:${ip}` : "unknown";
}
