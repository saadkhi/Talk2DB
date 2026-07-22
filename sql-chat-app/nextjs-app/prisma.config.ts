
// This file is used by the Prisma CLI for migrations and schema management.
// dotenv is NOT imported here — Next.js loads .env automatically,
// and Vercel injects environment variables at build time.
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
