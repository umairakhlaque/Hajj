# AskVault — Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key
- Clerk account (for admin auth)
- Google Cloud project (for OAuth)
- Vercel account (recommended)

---

## 1. Database Setup

### Option A: Local Development (Docker)
```bash
docker-compose up -d
```

Connection string:
```
DATABASE_URL="postgresql://askvault:askvault_dev_password@localhost:5432/askvault"
```

### Option B: Supabase (Recommended for production)
1. Create a Supabase project at supabase.com
2. Enable pgvector: `create extension if not exists vector;`
3. Use the connection string from Settings > Database

### Option C: Neon (Serverless Postgres)
1. Create a Neon project at neon.tech
2. Enable pgvector from Extensions
3. Use the connection string provided

---

## 2. Environment Configuration

```bash
cp .env.example .env.local
```

Fill in all required values. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI API key for embeddings + chat |
| `ENCRYPTION_KEY` | 64-char hex for token encryption — `openssl rand -hex 32` |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_SECRET_KEY` | JWT secret — `openssl rand -hex 32` |

---

## 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable APIs:
   - Google Drive API
   - Google Docs API
   - Google Slides API
   - Google OAuth2 API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `https://yourdomain.com/api/google/callback`
5. Copy Client ID and Client Secret to `.env.local`

---

## 4. Clerk Setup

1. Create a Clerk application at [clerk.com](https://clerk.com)
2. Copy API keys to `.env.local`
3. Configure webhook:
   - Endpoint: `https://yourdomain.com/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
4. Set redirect URLs in Clerk dashboard

---

## 5. Database Migration

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations (creates tables)
npm run prisma:migrate

# Or for development (push without migration history)
npm run prisma:push
```

**Enable pgvector extension first:**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 6. Development Server

```bash
npm install
npm run dev
```

Visit:
- Landing page: http://localhost:3000
- Admin console: http://localhost:3000/admin/dashboard
- Chat example: http://localhost:3000/t/demo/chat

---

## 7. Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
# ... etc
```

Or connect your GitHub repository in the Vercel dashboard for automatic deployments.

---

## 8. Background Jobs

The job worker runs separately from the Next.js app:

```bash
# Local
npm run jobs:worker

# Production: Deploy as a separate Vercel Cron or Railway service
```

For Vercel, use Vercel Cron Jobs for scheduled tasks (token refresh, stale cleanup).

---

## 9. First-Time Setup

1. Sign up at `/sign-up` — first user becomes SUPER_ADMIN
2. Go to `/admin/dashboard`
3. Create a workspace at `/admin/tenants`
4. Create a notebook at `/admin/notebooks`
5. Add content sources at `/admin/sources`
6. Approve sources (triggers ingestion automatically)
7. Test chat at `/t/[your-slug]/chat`

---

## Security Checklist

- [ ] `ENCRYPTION_KEY` is 64 random hex chars
- [ ] `ADMIN_SECRET_KEY` is unique and random
- [ ] Database not publicly accessible
- [ ] Google OAuth redirect URIs locked to your domain
- [ ] Clerk webhook signature validation enabled (production)
- [ ] Rate limiting configured appropriately
- [ ] Error messages are generic in production (NODE_ENV=production)
- [ ] HTTPS enforced on production domain
- [ ] Clerk user roles reviewed and assigned correctly
- [ ] pgvector extension enabled before running migrations

---

## Architecture Notes

### RAG Pipeline Flow
```
User Query → Sanitize → Embed → Vector Search → Security Filter → LLM Generation → Grounded Answer
```

### Connector Modes
- **Manual**: Admin pastes content → immediate privacy control
- **Google Drive**: OAuth-connected sync → automated content pull
- **Web URL**: Fetch & extract web page content
- **NotebookLM Enterprise**: Planned — awaiting official API

### Tenant Isolation
All database queries include `tenantId` filters. Vector search is also scoped by `tenantId` at the SQL level, preventing cross-tenant data leakage.

### Token Security
Google OAuth tokens are encrypted with AES-256-GCM before database storage. The encryption key is never stored in the database. Decryption only occurs server-side when a connector needs to make API calls.
