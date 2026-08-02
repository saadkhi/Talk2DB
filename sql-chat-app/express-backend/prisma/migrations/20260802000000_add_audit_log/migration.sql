-- CreateTable: AuditLog
-- Records every SQL query executed against a user's connected database.
-- Apply with: npx prisma migrate deploy

CREATE TABLE "AuditLog" (
    "id"           TEXT         NOT NULL,
    "userId"       TEXT         NOT NULL,
    "sql"          TEXT         NOT NULL,
    "source"       TEXT         NOT NULL,
    "success"      BOOLEAN      NOT NULL,
    "errorMessage" TEXT,
    "durationMs"   INTEGER,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey"
    FOREIGN KEY ("userId")
    REFERENCES "User"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
