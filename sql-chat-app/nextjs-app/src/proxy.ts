/**
 * proxy.ts — kept for historical reference only.
 *
 * Auth middleware has been moved to middleware.ts (the file Next.js actually
 * picks up as edge middleware). This file is no longer used.
 *
 * The old `withAuth` call here was blocking all unauthenticated requests to
 * /dashboard, which prevented the guest/demo mode from working.
 */
