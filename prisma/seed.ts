// ============================================
// AskVault — Database Seed Script
// Creates a demo workspace with sample data
// Run: npx prisma db seed
// ============================================

import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding AskVault database...\n");

  // ---- 1. Create demo tenant ----
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Demo Workspace",
      plan: "PROFESSIONAL",
      isActive: true,
      authMode: "ANONYMOUS",
      showCitations: true,
      showSourceSnippets: false,
      strictGroundedMode: true,
      allowCrossNotebook: true,
      branding: {
        create: {
          heroTitle: "Ask Our Knowledge Base",
          heroSubtitle:
            "Get instant, grounded answers from our curated knowledge vault.",
          primaryColor: "#6366f1",
          accentColor: "#f59e0b",
          suggestedPrompts: [
            "What is AskVault?",
            "How does the RAG pipeline work?",
            "What security features are included?",
            "How do I connect a Google account?",
          ],
        },
      },
    },
    include: { branding: true },
  });
  console.log(`✅ Tenant: ${tenant.name} (/t/demo/chat)`);

  // ---- 2. Create super admin user ----
  const adminUser = await prisma.user.upsert({
    where: { anonymousId: "seed-admin" },
    update: {},
    create: {
      anonymousId: "seed-admin",
      email: "admin@askvault.dev",
      name: "Demo Admin",
      role: "SUPER_ADMIN",
      tenantId: tenant.id,
    },
  });
  console.log(`✅ Admin user: ${adminUser.email}`);

  // ---- 3. Create demo notebook ----
  const notebook = await prisma.notebookRecord.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "platform-docs" } },
    update: {},
    create: {
      tenantId: tenant.id,
      slug: "platform-docs",
      displayName: "Platform Documentation",
      description: "Core documentation about the AskVault platform",
      connectorType: "MANUAL_TEXT",
      classification: "TENANT_VISIBLE",
      syncStatus: "SUCCESS",
      isActive: true,
      tags: ["documentation", "platform", "getting-started"],
    },
  });
  console.log(`✅ Notebook: ${notebook.displayName}`);

  // ---- 4. Create sample sources with real content ----
  const sources = [
    {
      title: "What is AskVault?",
      content: `# What is AskVault?

AskVault is a premium private knowledge chat platform that lets organizations deploy a luxury chat interface backed by their private knowledge bases.

## Core Concept

Unlike public AI assistants, AskVault answers questions ONLY from content that you have approved and loaded into the platform. This means:

- No hallucinations — if the answer isn't in your knowledge base, AskVault says so clearly.
- No data leakage — your documents and notebooks stay private on your servers.
- No exposure — end users see a clean chat interface, never the raw source files.

## Who Is It For?

AskVault is built for organizations that need to share knowledge with internal teams or customers without exposing raw documentation, internal notebooks, or proprietary data.

Examples:
- A company deploying a customer support knowledge base
- A law firm making internal legal research accessible to staff
- A consulting firm sharing curated research with clients
- An educational institution providing students with guided answers
`,
    },
    {
      title: "How the RAG Pipeline Works",
      content: `# AskVault RAG Pipeline

AskVault uses a Retrieval-Augmented Generation (RAG) pipeline to produce grounded answers.

## Pipeline Steps

### 1. Ingestion
When you add a source document, AskVault:
- Normalizes the text (removes noise, fixes encoding)
- Splits it into overlapping chunks of 400-900 tokens
- Preserves section headings and document hierarchy
- Generates vector embeddings using OpenAI text-embedding-3-large
- Stores embeddings in PostgreSQL with the pgvector extension

### 2. Retrieval
When a user asks a question:
- The query is embedded using the same model
- pgvector performs cosine similarity search against all approved chunks
- Results are filtered by tenant isolation and content classification
- Top 8 most relevant chunks are selected

### 3. Generation
The retrieved chunks are passed to GPT-4o with a strict system prompt:
- Answer ONLY from the retrieved content
- Do not invent facts
- If no evidence exists, say so clearly
- Cite the notebook and source title

### 4. Security Layers
- Retrieved content is wrapped in DATA markers, not treated as instructions
- Prompt injection patterns are detected and flagged
- Confidence scoring determines if the answer is reliable
- Low-confidence answers trigger a graceful refusal
`,
    },
    {
      title: "Security Features",
      content: `# AskVault Security Features

Security is a first-class citizen in AskVault. Every layer of the stack has security controls.

## Token Security
All Google OAuth tokens are encrypted with AES-256-GCM before being stored in the database. The encryption key is stored only in environment variables and never touches the database. Decryption happens only server-side, in memory, when a connector needs to make an API call.

## Tenant Isolation
Every database query is scoped by tenantId. The vector search SQL includes a tenantId filter, so it is physically impossible for one tenant's data to appear in another tenant's results.

## Prompt Injection Defense
AskVault treats all retrieved content as DATA, not instructions. The system prompt explicitly instructs the model to ignore any instructions that may appear within retrieved chunks. Additionally, user queries are scanned for known injection patterns before processing.

## Rate Limiting
- Chat endpoint: 20 requests per minute per IP
- API endpoints: 60 requests per minute per IP
- Session creation: 10 per minute per IP

## Content Classification
Every source record has a classification level:
- PRIVATE: Only accessible by SUPER_ADMIN
- INTERNAL: Accessible by tenant admins and editors
- TENANT_VISIBLE: Accessible by all authenticated tenant users
- PUBLIC: Accessible by anonymous users

## Audit Logs
Every admin action is recorded in the AuditLog table including the action type, resource affected, user ID, and IP address. Logs are immutable (insert only).
`,
    },
    {
      title: "Connecting Google Accounts",
      content: `# Connecting Google Accounts

AskVault supports connecting multiple Google accounts to sync content from Google Drive, Docs, and Slides.

## How to Connect

1. Go to Admin Console → Google Accounts
2. Click "Connect Account"
3. You will be redirected to Google's OAuth consent screen
4. Grant the requested permissions (Drive readonly, Docs readonly, Slides readonly)
5. You will be redirected back to AskVault with the account connected

## What Permissions Are Requested

AskVault requests the minimum necessary permissions:
- userinfo.email — to identify the account
- drive.readonly — to list and read files
- documents.readonly — to read Google Docs content
- presentations.readonly — to read Google Slides content

AskVault does NOT request write permissions. It cannot modify your Google Drive or Docs.

## Token Storage

After connection, your refresh token is encrypted with AES-256-GCM and stored in the database. The encryption key is in your environment variables. Raw tokens are never logged or returned in API responses.

## Refresh Token Rotation

AskVault automatically refreshes access tokens before they expire. If refresh fails 3 times, the account is marked as revoked and you will need to reconnect it.

## Multiple Accounts

You can connect as many Google accounts as needed. Each account can be used as the source for multiple notebooks. This is useful if your knowledge is spread across different Google Workspace accounts.
`,
    },
  ];

  for (const s of sources) {
    const existing = await prisma.sourceRecord.findFirst({
      where: { notebookRecordId: notebook.id, title: s.title },
    });

    if (!existing) {
      await prisma.sourceRecord.create({
        data: {
          notebookRecordId: notebook.id,
          title: s.title,
          connectorType: "MANUAL_TEXT",
          rawContent: s.content,
          normalizedContent: s.content,
          contentHash: crypto
            .createHash("sha256")
            .update(s.content)
            .digest("hex"),
          wordCount: s.content.split(/\s+/).length,
          characterCount: s.content.length,
          sourceType: "text",
          classification: "TENANT_VISIBLE",
          // Auto-approved for seed data
          status: "APPROVED",
        },
      });
      console.log(`  ✅ Source: ${s.title}`);
    } else {
      console.log(`  ⏭  Source already exists: ${s.title}`);
    }
  }

  // ---- 5. Create a demo collection ----
  const collection = await prisma.notebookCollection.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "getting-started" } },
    update: {},
    create: {
      tenantId: tenant.id,
      slug: "getting-started",
      displayName: "Getting Started",
      description: "Everything you need to get started with AskVault",
      color: "#6366f1",
    },
  });

  // Map notebook to collection
  await prisma.notebookCollectionMapping.upsert({
    where: {
      notebookCollectionId_notebookRecordId: {
        notebookCollectionId: collection.id,
        notebookRecordId: notebook.id,
      },
    },
    update: {},
    create: {
      notebookCollectionId: collection.id,
      notebookRecordId: notebook.id,
      order: 0,
    },
  });

  console.log(`✅ Collection: ${collection.displayName}`);

  // ---- Summary ----
  console.log("\n" + "─".repeat(50));
  console.log("🎉 Seed complete!\n");
  console.log("Next steps:");
  console.log("  1. Run: npm run dev");
  console.log("  2. Visit: http://localhost:3000/t/demo/chat");
  console.log("  3. Try asking: 'What is AskVault?'");
  console.log("\nNote: Sources are seeded but NOT yet embedded.");
  console.log("To enable search, trigger a sync from the admin panel");
  console.log("or run: npx tsx scripts/embed-seed-data.ts\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
