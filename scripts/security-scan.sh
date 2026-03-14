#!/bin/bash
# security-scan.sh — Lightweight security scan for sprint gate
# Run before creating PR. Catches common security anti-patterns.
#
# Usage: ./scripts/security-scan.sh <app-dir>

set -euo pipefail

APP_DIR="${1:-.}"
FAIL=0

echo "🔒 Security scan: $APP_DIR"
echo "---"

# 1. Hardcoded secret prefixes
echo "Checking for hardcoded secret prefixes..."
if grep -rn 'SK-INTERNAL' "$APP_DIR/src/" 2>/dev/null | grep -v '.test.' | grep -v 'node_modules' | grep -v '^\s*//\|^\s*\*' | grep -v "INTERNAL_KEY_PREFIX\s*=\s*'SK-INTERNAL'" | grep -v 'startsWith(INTERNAL_KEY_PREFIX)'; then
  echo "❌ Hardcoded SK-INTERNAL prefix found"
  FAIL=1
fi
if grep -rn "startsWith('sk_" "$APP_DIR/src/" 2>/dev/null | grep -v '.test.' | grep -v 'node_modules'; then
  echo "❌ Hardcoded Stripe key prefix check found"
  FAIL=1
fi
[ "$FAIL" -eq 0 ] && echo "✅ No hardcoded secret prefixes"

# 2. Math.random() in security-sensitive paths
echo ""
echo "Checking for Math.random() in security paths..."
RANDOM_HITS=$(grep -rn 'Math\.random()' "$APP_DIR/src/" 2>/dev/null | grep -v 'node_modules' | grep -vi 'delay\|timeout\|jitter\|animation\|test' || true)
if [ -n "$RANDOM_HITS" ]; then
  echo "⚠️  Math.random() found (review for security sensitivity):"
  echo "$RANDOM_HITS"
fi

# 3. Missing Content-Type guards on POST routes
echo ""
echo "Checking POST routes for Content-Type guards..."
for route in $(find "$APP_DIR/src/app/api" -name "route.ts" 2>/dev/null); do
  if grep -q 'export async function POST' "$route"; then
    if ! grep -q 'content-type\|Content-Type\|contentType' "$route"; then
      echo "⚠️  No Content-Type check in: $route"
    fi
  fi
done

# 4. Input validation — check for uncapped string fields
echo ""
echo "Checking for uncapped user input..."
UNCAPPED=$(grep -rn '\.body\.' "$APP_DIR/src/app/api/" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'slice\|substring\|maxLength\|MAX_' || true)
if [ -n "$UNCAPPED" ]; then
  echo "⚠️  Potentially uncapped body fields (review manually):"
  echo "$UNCAPPED" | head -10
fi

# 5. Rate limiting on public endpoints
echo ""
echo "Checking public POST routes for rate limiting..."
for route in $(find "$APP_DIR/src/app/api" -name "route.ts" 2>/dev/null); do
  if grep -q 'export async function POST' "$route"; then
    if ! grep -q 'rateLimit\|rateLimitKV\|checkRate' "$route"; then
      echo "⚠️  No rate limiting in: $route"
    fi
  fi
done

# 6. Env var secrets in source
echo ""
echo "Checking for potential secrets in source..."
SECRET_HITS=$(grep -rn 'sk_live_\|sk_test_\|whsec_\|Bearer [A-Za-z0-9]' "$APP_DIR/src/" 2>/dev/null | grep -v 'node_modules' | grep -v '.test.' | grep -v 'process\.env' | grep -v 'example\|placeholder\|YOUR_\|\.\.\.' || true)
if [ -n "$SECRET_HITS" ]; then
  echo "❌ Potential secrets in source code:"
  echo "$SECRET_HITS"
  FAIL=1
fi
[ -z "$SECRET_HITS" ] && echo "✅ No secrets in source"

echo ""
echo "---"
if [ "$FAIL" -eq 0 ]; then
  echo "✅ Security scan passed"
else
  echo "❌ Security scan FAILED — fix issues above before PR"
  exit 1
fi
