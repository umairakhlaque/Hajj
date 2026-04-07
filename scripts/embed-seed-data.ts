#!/usr/bin/env tsx
// ============================================
// AskVault — Embed Seed Data
// Generates embeddings for all seeded sources
// Run: npx tsx scripts/embed-seed-data.ts
// ============================================

import { PrismaClient } from "@prisma/client";

// Must import after dotenv would be loaded
async function main() {
  // Load env
  const path = await import("path");
  const fs = await import("fs");
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }

  const { PrismaClient } = await import("@prisma/client");
  const { ingestSource } = await import("../src/lib/ai/ingestion");

  const prisma = new PrismaClient();

  console.log("🔢 Embedding seed data...\n");

  const sources = await prisma.sourceRecord.findMany({
    where: { status: "APPROVED" },
    select: { id: true, title: true },
  });

  if (sources.length === 0) {
    console.log("No approved sources found. Run: npx prisma db seed first.");
    process.exit(0);
  }

  for (const source of sources) {
    console.log(`Embedding: ${source.title}...`);
    try {
      const result = await ingestSource(source.id);
      console.log(`  ✅ ${result.chunksCreated} chunks, ${result.chunksEmbedded} embedded`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Embedding complete! The demo chat is now ready.");
  console.log("Visit: http://localhost:3000/t/demo/chat\n");
}

main().catch(console.error);
