/**
 * queue.ts — BullMQ queue factory
 *
 * IMPORTANT: This module must ONLY be imported by the standalone worker
 * process (src/worker.ts) or server-side Node.js scripts — never directly
 * from a Next.js App Router route handler.
 *
 * Next.js bundles route handlers for Vercel's serverless runtime, which
 * cannot resolve ioredis (a native Node.js module). Importing this file
 * from a route will break the Vercel build.
 *
 * For scheduling, API routes should only write to the DB (SavedReport.schedule).
 * The worker process polls/reads those records independently.
 */

// Lazy singleton — Queue is only instantiated when first accessed, not at
// module evaluation time. This prevents build-time errors if the module is
// accidentally imported in a Next.js bundle.
let _queue: any = null;
let _queueEvents: any = null;

function getConnection() {
    return {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379", 10),
        password: process.env.REDIS_PASSWORD || undefined,
    };
}

export async function getReportQueue() {
    if (!_queue) {
        // Dynamic import so bundlers never statically analyse bullmq
        const { Queue } = await import("bullmq");
        _queue = new Queue("reportQueue", { connection: getConnection() });
    }
    return _queue;
}

export async function getReportQueueEvents() {
    if (!_queueEvents) {
        const { QueueEvents } = await import("bullmq");
        _queueEvents = new QueueEvents("reportQueue", { connection: getConnection() });
    }
    return _queueEvents;
}

// Legacy sync exports kept for worker.ts which runs in plain Node (not bundled)
// These are safe because worker.ts is never processed by Next.js/Turbopack.
export const reportQueueSync = () => getReportQueue();
