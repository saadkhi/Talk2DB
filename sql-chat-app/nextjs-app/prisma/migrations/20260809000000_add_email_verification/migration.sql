-- Add email OTP verification fields to User table
ALTER TABLE "User"
    ADD COLUMN IF NOT EXISTS "emailVerified"    TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "verifyCode"       TEXT,
    ADD COLUMN IF NOT EXISTS "verifyCodeExpiry" TIMESTAMP(3);
