/**
 * teamAuth.ts — Role-based access helpers for team workspaces (Phase 6.4)
 *
 * Roles (stored in TeamMember.role):
 *   "owner"  — full control: manage members, delete team, add/remove DBs
 *   "editor" — can create/edit shared queries and dashboards
 *   "viewer" — read-only: can browse and fork shared resources
 *
 * Usage:
 *   const member = await requireTeamMember(session, teamId, "editor");
 *   // throws if unauthorized; returns the TeamMember row otherwise
 */

import { Session } from "next-auth";
import prisma from "./prisma";
import { resolveUserId } from "./resolveUser";

export type TeamRole = "owner" | "editor" | "viewer";

/** Ordered hierarchy: higher index = more privileged */
const ROLE_HIERARCHY: TeamRole[] = ["viewer", "editor", "owner"];

/** Returns true if `actual` satisfies the `required` minimum role */
export function hasRole(actual: string, required: TeamRole): boolean {
    const actualIdx = ROLE_HIERARCHY.indexOf(actual as TeamRole);
    const requiredIdx = ROLE_HIERARCHY.indexOf(required);
    if (actualIdx === -1) return false; // unknown role
    return actualIdx >= requiredIdx;
}

export class TeamAuthError extends Error {
    constructor(
        message: string,
        public readonly statusCode: number = 403
    ) {
        super(message);
        this.name = "TeamAuthError";
    }
}

/**
 * Resolve the calling user's TeamMember record and assert they hold at
 * least `minRole`. Throws a `TeamAuthError` (403 / 404) if not.
 *
 * Returns the full TeamMember row on success.
 */
export async function requireTeamMember(
    session: Session | null,
    teamId: string,
    minRole: TeamRole = "viewer"
) {
    if (!session?.user) {
        throw new TeamAuthError("Unauthorized", 401);
    }

    const userId = await resolveUserId(session);
    if (!userId) {
        throw new TeamAuthError("User not found", 401);
    }

    // Verify the team exists
    const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { id: true, name: true, slug: true },
    });
    if (!team) {
        throw new TeamAuthError("Team not found", 404);
    }

    const member = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!member) {
        throw new TeamAuthError("You are not a member of this team", 403);
    }

    if (!hasRole(member.role, minRole)) {
        throw new TeamAuthError(
            `This action requires the '${minRole}' role. You are '${member.role}'.`,
            403
        );
    }

    return { member, team, userId };
}

/**
 * Like requireTeamMember but returns null instead of throwing, so callers
 * can handle the absence gracefully (e.g. to conditionally render UI).
 */
export async function getTeamMember(
    session: Session | null,
    teamId: string
): Promise<{ member: any; team: any; userId: string } | null> {
    try {
        return await requireTeamMember(session, teamId, "viewer");
    } catch {
        return null;
    }
}

/**
 * Returns all teams the resolved user belongs to, with their own role.
 */
export async function getUserTeams(session: Session | null) {
    if (!session?.user) return [];
    const userId = await resolveUserId(session);
    if (!userId) return [];

    return prisma.teamMember.findMany({
        where: { userId },
        include: {
            team: {
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    description: true,
                    createdAt: true,
                    _count: { select: { members: true, teamDbs: true, sharedQueries: true } },
                },
            },
        },
        orderBy: { joinedAt: "asc" },
    });
}

/**
 * Generate a URL-safe slug from a team name, appending a short random suffix
 * to ensure uniqueness.
 */
export function generateTeamSlug(name: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    const suffix = Math.random().toString(36).slice(2, 7);
    return `${base}-${suffix}`;
}
