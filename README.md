# AskVault — Premium Private Knowledge Chat Platform

A production-grade, enterprise-quality chat platform that serves grounded answers from private knowledge bases — without ever exposing notebooks, source files, or raw content to end users.

---

## What It Is

AskVault lets organizations deploy a **luxury chat interface** backed by curated knowledge from:
- Multiple Google accounts and Google Drive / Docs / Slides
- Manually uploaded or pasted content  
- Web pages and URLs
- NotebookLM-derived exports (via manual or enterprise API modes)

**End users only see a chat box.** All knowledge, notebooks, and sources stay private in the backend.

---

## Architecture

```
User Query
    │
    ▼
Sanitize & Rate-Limit (prompt injection defense)
    │
    ▼
Embed Query (OpenAI text-embedding-3-large)
    │
    ▼
Vector Search (pgvector, tenant-isolated)
    │
    ▼
Security Filter (classification, access policy)
    │
    ▼
Grounded Generation (GPT-4o, strict mode)
    │
    ▼
Citations + Confidence Score → User
```

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Next.js Route Handlers, Node.js |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| AI | OpenAI (embeddings + chat) |
| Auth | Clerk (admin) + JWT sessions (end users) |
| Google | googleapis, google-auth-library |
| Jobs | pg-boss |
| Security | AES-256-GCM, rate limiting, prompt injection defense |

---

## Key Features

### For Admins
- **Multi-tenant workspaces** — serve multiple customers from one platform
- **Multiple Google account connections** — connect many accounts, each with many notebooks
- **Source approval workflow** — content must be approved before it becomes searchable
- **Content classification** — Private / Internal / Tenant-Visible / Public
- **Knowledge sync** — manual, Google Drive, web URL connectors
- **Analytics dashboard** — top queries, satisfaction rate, grounded rate
- **Full audit logs** — every admin action recorded
- **Sync monitoring** — real-time job progress tracking

### For End Users
- **Clean chat-only interface** — no notebook tree, no source browser
- **Grounded answers** — backed by retrieved content, never hallucinated
- **Lightweight citations** — notebook + source title (configurable)
- **Feedback** — thumbs up/down on every answer
- **Suggested prompts** — configurable per tenant
- **Session memory** — conversation history within a session

### Security
- AES-256-GCM encryption for all OAuth tokens at rest
- Prompt injection detection and data/instruction separation
- Row-level tenant isolation on every query
- Retrieval-time classification filtering
- Rate limiting (20 chat req/min per IP)
- Zero raw source exposure to end users
- Audit logs on all admin actions

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/sign-in` | Admin sign-in (Clerk) |
| `/admin/dashboard` | Admin dashboard |
| `/admin/tenants` | Workspace management |
| `/admin/notebooks` | Notebook management |
| `/admin/sources` | Source approval & management |
| `/admin/sync` | Sync job monitoring |
| `/admin/analytics` | Usage analytics |
| `/admin/google-accounts` | Google OAuth connections |
| `/admin/settings` | Platform settings |
| `/t/[slug]/chat` | Tenant chat page (end users) |
| `/t/[slug]/notebooks/[nb]/chat` | Notebook-scoped chat |
| `/t/[slug]/collections/[col]/chat` | Collection-scoped chat |

---

## Quick Start

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in all required values

# 3. Start database (Docker)
docker-compose up -d

# 4. Run migrations
npm run prisma:push

# 5. Start dev server
npm run dev

# 6. (Optional) Start job worker
npm run jobs:worker
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production deployment instructions.

---

## KnowledgeConnector Modes

| Mode | Connector | Use Case |
|------|-----------|----------|
| A — Manual | `ManualUploadConnector` | Highest privacy, admin pastes content |
| B — Google Workspace | `GoogleDriveConnector` | Auto-sync from Drive/Docs/Slides |
| C — Web | `WebUrlConnector` | Fetch and index web pages |
| D — NotebookLM Enterprise | Planned | Official API when available |

---

## License

Private — All rights reserved.
