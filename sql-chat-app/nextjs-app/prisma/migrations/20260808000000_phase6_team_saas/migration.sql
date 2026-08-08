-- Phase 6: Team & SaaS Scale migration
-- Adds: LlmUsage, Team, TeamMember, TeamDb, TeamQuery, TeamDashboardItem

-- ── LLM Usage ──────────────────────────────────────────────────────────────────
CREATE TABLE "LlmUsage" (
    "id"           TEXT NOT NULL,
    "userId"       TEXT NOT NULL,
    "provider"     TEXT NOT NULL,
    "model"        TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "source"       TEXT NOT NULL,
    "success"      BOOLEAN NOT NULL,
    "durationMs"   INTEGER,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmUsage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LlmUsage_userId_idx" ON "LlmUsage"("userId");
CREATE INDEX "LlmUsage_createdAt_idx" ON "LlmUsage"("createdAt");

ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Team ───────────────────────────────────────────────────────────────────────
CREATE TABLE "Team" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "slug"        TEXT NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE INDEX "Team_slug_idx" ON "Team"("slug");

-- ── TeamMember ─────────────────────────────────────────────────────────────────
CREATE TABLE "TeamMember" (
    "id"       TEXT NOT NULL,
    "teamId"   TEXT NOT NULL,
    "userId"   TEXT NOT NULL,
    "role"     TEXT NOT NULL DEFAULT 'viewer',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeamDb ─────────────────────────────────────────────────────────────────────
CREATE TABLE "TeamDb" (
    "id"                 TEXT NOT NULL,
    "teamId"             TEXT NOT NULL,
    "name"               TEXT NOT NULL,
    "dbConnectionString" TEXT NOT NULL,
    "dbDialect"          TEXT NOT NULL DEFAULT 'postgresql',
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDb_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamDb_teamId_idx" ON "TeamDb"("teamId");

ALTER TABLE "TeamDb" ADD CONSTRAINT "TeamDb_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeamQuery ──────────────────────────────────────────────────────────────────
CREATE TABLE "TeamQuery" (
    "id"          TEXT NOT NULL,
    "teamId"      TEXT NOT NULL,
    "authorId"    TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "sql"         TEXT NOT NULL,
    "tags"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamQuery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamQuery_teamId_idx" ON "TeamQuery"("teamId");
CREATE INDEX "TeamQuery_authorId_idx" ON "TeamQuery"("authorId");

ALTER TABLE "TeamQuery" ADD CONSTRAINT "TeamQuery_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamQuery" ADD CONSTRAINT "TeamQuery_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── TeamDashboardItem ──────────────────────────────────────────────────────────
CREATE TABLE "TeamDashboardItem" (
    "id"        TEXT NOT NULL,
    "teamId"    TEXT NOT NULL,
    "authorId"  TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "sql"       TEXT NOT NULL,
    "config"    TEXT,
    "pinned"    BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamDashboardItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeamDashboardItem_teamId_idx" ON "TeamDashboardItem"("teamId");

ALTER TABLE "TeamDashboardItem" ADD CONSTRAINT "TeamDashboardItem_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamDashboardItem" ADD CONSTRAINT "TeamDashboardItem_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
