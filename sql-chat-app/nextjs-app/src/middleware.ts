/**
 * middleware.ts — Next.js edge middleware
 *
 * Rules:
 *   /admin          → must be authenticated (redirect to login if not)
 *   /dashboard/*    → guests are ALLOWED (the demo/guest system handles them
 *                     inside the page; no redirect)
 *   everything else → pass through
 *
 * We intentionally do NOT use `withAuth` here because that would block all
 * unauthenticated requests to /dashboard, breaking the "Try Demo" guest flow.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // /admin is strictly authenticated-only
    if (pathname.startsWith("/admin")) {
        const token = await getToken({ req: req as any, secret: process.env.NEXTAUTH_SECRET });
        if (!token) {
            const loginUrl = new URL("/auth/login", req.url);
            loginUrl.searchParams.set("callbackUrl", req.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    // /dashboard — allow everyone (guests see the demo system inside the page)
    // /api, /auth, everything else — pass through
    return NextResponse.next();
}

export const config = {
    // Only run on admin and dashboard routes — skip _next, static, api, auth
    matcher: ["/admin/:path*", "/dashboard/:path*"],
};
