#!/usr/bin/env bash
# ============================================
# AskVault — Generate Required Secret Keys
# Usage: bash scripts/gen-keys.sh
# ============================================

echo ""
echo "AskVault — Generated Secret Keys"
echo "Copy these into your .env.local"
echo ""
echo "# Paste these into .env.local:"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "ADMIN_SECRET_KEY=$(openssl rand -hex 32)"
echo "CRON_SECRET=$(openssl rand -hex 16)"
echo "WEBHOOK_SECRET=$(openssl rand -hex 16)"
echo ""
echo "⚠  Keep these secret. Never commit them to git."
echo ""
