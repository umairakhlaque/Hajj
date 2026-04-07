#!/usr/bin/env tsx
// ============================================
// AskVault — Environment Validation Script
// Run: npx tsx scripts/validate-env.ts
// ============================================

interface EnvVar {
  key: string;
  required: boolean;
  description: string;
  validate?: (val: string) => string | null; // returns error string or null
}

const ENV_VARS: EnvVar[] = [
  // Database
  {
    key: "DATABASE_URL",
    required: true,
    description: "PostgreSQL connection string",
    validate: (v) =>
      v.startsWith("postgresql://") || v.startsWith("postgres://")
        ? null
        : "Must start with postgresql:// or postgres://",
  },

  // OpenAI
  {
    key: "OPENAI_API_KEY",
    required: true,
    description: "OpenAI API key for embeddings and chat",
    validate: (v) =>
      v.startsWith("sk-") ? null : "Must start with 'sk-'",
  },
  {
    key: "OPENAI_EMBEDDING_MODEL",
    required: false,
    description: "Embedding model (default: text-embedding-3-large)",
  },
  {
    key: "OPENAI_CHAT_MODEL",
    required: false,
    description: "Chat model (default: gpt-4o)",
  },

  // Clerk
  {
    key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    required: true,
    description: "Clerk publishable key",
    validate: (v) =>
      v.startsWith("pk_") ? null : "Must start with 'pk_'",
  },
  {
    key: "CLERK_SECRET_KEY",
    required: true,
    description: "Clerk secret key",
    validate: (v) =>
      v.startsWith("sk_") ? null : "Must start with 'sk_'",
  },

  // Security
  {
    key: "ENCRYPTION_KEY",
    required: true,
    description: "AES-256 key for token encryption (64 hex chars)",
    validate: (v) => {
      if (v.length < 64) return `Too short: ${v.length} chars, need 64`;
      if (!/^[0-9a-fA-F]+$/.test(v)) return "Must be hex characters only";
      return null;
    },
  },
  {
    key: "ADMIN_SECRET_KEY",
    required: true,
    description: "JWT secret for admin sessions",
    validate: (v) =>
      v.length >= 32 ? null : "Must be at least 32 characters",
  },

  // Google OAuth
  {
    key: "GOOGLE_CLIENT_ID",
    required: true,
    description: "Google OAuth client ID",
    validate: (v) =>
      v.includes(".apps.googleusercontent.com")
        ? null
        : "Should end with .apps.googleusercontent.com",
  },
  {
    key: "GOOGLE_CLIENT_SECRET",
    required: true,
    description: "Google OAuth client secret",
  },
  {
    key: "GOOGLE_REDIRECT_URI",
    required: true,
    description: "OAuth callback URL",
    validate: (v) =>
      v.includes("/api/google/callback")
        ? null
        : "Must include /api/google/callback",
  },

  // App
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: false,
    description: "Public app URL",
    validate: (v) =>
      v.startsWith("http") ? null : "Must start with http:// or https://",
  },

  // Optional
  {
    key: "CRON_SECRET",
    required: false,
    description: "Secret for cron job authentication",
  },
  {
    key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    required: false,
    description: "Cloudflare Turnstile site key (optional bot protection)",
  },
];

// ---- Runner ----

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function check() {
  console.log(`\n${BOLD}AskVault — Environment Validation${RESET}\n`);
  console.log(`${DIM}Checking .env.local / process.env...${RESET}\n`);

  // Load .env.local if it exists
  try {
    const fs = require("fs");
    const path = require("path");
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
  } catch {}

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const val = process.env[envVar.key];
    const present = val && val.length > 0;

    if (envVar.required && !present) {
      console.log(`${RED}✗${RESET} ${BOLD}${envVar.key}${RESET} ${RED}MISSING${RESET}`);
      console.log(`  ${DIM}${envVar.description}${RESET}`);
      errors.push(envVar.key);
      continue;
    }

    if (!present) {
      console.log(`${YELLOW}○${RESET} ${envVar.key} ${DIM}(optional, not set)${RESET}`);
      warnings.push(envVar.key);
      continue;
    }

    // Run validation
    const validationError = envVar.validate?.(val!);
    if (validationError) {
      console.log(`${YELLOW}⚠${RESET} ${BOLD}${envVar.key}${RESET} ${YELLOW}INVALID${RESET}`);
      console.log(`  ${DIM}${validationError}${RESET}`);
      warnings.push(envVar.key);
    } else {
      const display = val!.length > 20
        ? val!.slice(0, 8) + "..." + val!.slice(-4)
        : val!.slice(0, 4) + "****";
      console.log(`${GREEN}✓${RESET} ${envVar.key} ${DIM}(${display})${RESET}`);
    }
  }

  // Summary
  console.log("\n" + "─".repeat(50));

  if (errors.length === 0 && warnings.filter(w => ENV_VARS.find(e => e.key === w && e.required)).length === 0) {
    console.log(`\n${GREEN}${BOLD}✅ All required environment variables are set!${RESET}`);
    console.log(`${DIM}You're ready to run: npm run dev${RESET}\n`);
    process.exit(0);
  } else {
    if (errors.length > 0) {
      console.log(`\n${RED}${BOLD}✗ ${errors.length} required variable(s) missing:${RESET}`);
      errors.forEach(e => console.log(`  ${RED}• ${e}${RESET}`));
    }
    if (warnings.length > 0) {
      console.log(`\n${YELLOW}⚠ ${warnings.length} warning(s) — optional or invalid format${RESET}`);
    }
    console.log(`\n${DIM}See .env.example for all required variables.${RESET}\n`);
    process.exit(errors.length > 0 ? 1 : 0);
  }
}

check();
