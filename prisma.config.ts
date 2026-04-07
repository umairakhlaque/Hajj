// ============================================
// AskVault — Prisma v7 Config
// Uses datasource.url for migrations
// ============================================

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
