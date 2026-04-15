// ============================================
// AskVault — Prisma v7 Config
// ============================================

import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Manually load .env files since Prisma config runs before Next.js env loading
const envFiles = [".env.local", ".env"];
for (const file of envFiles) {
  const filePath = path.resolve(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
    break;
  }
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
