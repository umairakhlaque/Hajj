#!/usr/bin/env bash
# ============================================
# AskVault — One-Command Local Setup Script
# Usage: bash scripts/setup.sh
# ============================================

set -e

BOLD="\033[1m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"
BLUE="\033[34m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       AskVault — Local Setup         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ---- Helpers ----
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${RED}✗ $1 is not installed. Please install it first.${RESET}"
    exit 1
  fi
  echo -e "${GREEN}✓${RESET} $1 found"
}

step() {
  echo ""
  echo -e "${BLUE}▶ $1${RESET}"
}

success() {
  echo -e "${GREEN}✓ $1${RESET}"
}

warn() {
  echo -e "${YELLOW}⚠ $1${RESET}"
}

# ---- 1. Check prerequisites ----
step "Checking prerequisites..."
check_command node
check_command npm
check_command docker
check_command docker-compose

NODE_VERSION=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ required (found: $(node -v))${RESET}"
  exit 1
fi
success "Node.js version OK ($(node -v))"

# ---- 2. Install dependencies ----
step "Installing dependencies..."
npm install
success "Dependencies installed"

# ---- 3. Set up .env.local ----
step "Setting up environment..."
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo ""
  echo -e "${YELLOW}⚠  .env.local created from .env.example${RESET}"
  echo -e "${YELLOW}   You MUST fill in the following values before proceeding:${RESET}"
  echo ""
  echo -e "   ${BOLD}Required:${RESET}"
  echo "   • DATABASE_URL       — PostgreSQL connection string"
  echo "   • OPENAI_API_KEY     — Your OpenAI API key (sk-...)"
  echo "   • ENCRYPTION_KEY     — Run: openssl rand -hex 32"
  echo "   • ADMIN_SECRET_KEY   — Run: openssl rand -hex 32"
  echo "   • NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
  echo "   • CLERK_SECRET_KEY"
  echo "   • GOOGLE_CLIENT_ID"
  echo "   • GOOGLE_CLIENT_SECRET"
  echo ""
  echo -e "   Edit ${BOLD}.env.local${RESET} then re-run this script."
  echo ""

  # Generate secure keys and insert them
  if command -v openssl &>/dev/null; then
    ENC_KEY=$(openssl rand -hex 32)
    ADMIN_KEY=$(openssl rand -hex 32)
    sed -i.bak "s|your_64_char_hex_key_here|${ENC_KEY}|g" .env.local
    sed -i.bak "s|your_admin_secret_here|${ADMIN_KEY}|g" .env.local
    rm -f .env.local.bak
    echo -e "   ${GREEN}✓ Auto-generated ENCRYPTION_KEY and ADMIN_SECRET_KEY${RESET}"
    echo ""
  fi

  exit 0
else
  success ".env.local already exists"
fi

# ---- 4. Validate environment ----
step "Validating environment variables..."
if npx tsx scripts/validate-env.ts; then
  success "Environment validation passed"
else
  echo -e "${RED}Environment validation failed. Fix .env.local and re-run.${RESET}"
  exit 1
fi

# ---- 5. Start database ----
step "Starting PostgreSQL with pgvector..."
if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
  success "PostgreSQL already running"
else
  docker-compose up -d postgres
  echo "Waiting for PostgreSQL to be ready..."
  for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U askvault &>/dev/null; then
      break
    fi
    sleep 1
  done
  success "PostgreSQL started"
fi

# ---- 6. Run migrations ----
step "Running database migrations..."
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma migrate deploy
success "Database migrations complete"

# ---- 7. Seed demo data ----
step "Seeding demo data..."
if npx prisma db seed; then
  success "Demo data seeded"
else
  warn "Seed failed (this is OK if data already exists)"
fi

# ---- 8. Done ----
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ✅ AskVault is ready to run!            ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}Start the dev server:${RESET}"
echo -e "  ${BLUE}npm run dev${RESET}"
echo ""
echo -e "  ${BOLD}Then visit:${RESET}"
echo -e "  ${BLUE}http://localhost:3000${RESET}            → Landing page"
echo -e "  ${BLUE}http://localhost:3000/sign-in${RESET}    → Admin sign-in"
echo -e "  ${BLUE}http://localhost:3000/t/demo/chat${RESET} → Demo chat"
echo ""
echo -e "  ${BOLD}Optional — embed seed data (requires OpenAI key):${RESET}"
echo -e "  ${BLUE}npx tsx scripts/embed-seed-data.ts${RESET}"
echo ""
