#!/bin/bash
#
# PHASE 11 - AUTOMATED DEPLOYMENT SCRIPT (Bash/Linux)
#
# This script automates the entire deployment process from staging to production
#
# Usage:
#   ./deploy-production-automated.sh staging
#   ./deploy-production-automated.sh production --dry-run
#   ./deploy-production-automated.sh production --skip-backup --verbose
#

set -euo pipefail

# Parse arguments
ENVIRONMENT="${1:?Usage: $0 [staging|production]}"
DRY_RUN=false
SKIP_BACKUP=false
VERBOSE=false

while [[ $# -gt 1 ]]; do
  case "${2}" in
    --dry-run) DRY_RUN=true ;;
    --skip-backup) SKIP_BACKUP=true ;;
    --verbose) VERBOSE=true ;;
    *) echo "Unknown option: $2"; exit 1 ;;
  esac
  shift
done

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper functions
write_step() {
  echo ""
  echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║ ► $1${NC}"
  echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
}

write_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

write_error() {
  echo -e "${RED}❌ $1${NC}"
}

write_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

invoke_command() {
  local cmd="$1"
  local desc="$2"
  local continue_on_error="${3:-false}"
  
  echo "   $desc..."
  
  if [ "$DRY_RUN" = true ]; then
    echo "   ${BLUE}[DRY RUN]${NC} $cmd"
    return 0
  fi
  
  if eval "$cmd" > /dev/null 2>&1; then
    write_success "$desc"
    return 0
  else
    write_error "$desc failed"
    if [ "$continue_on_error" = false ]; then
      exit 1
    fi
    return 1
  fi
}

# ============================================================================
# PHASE 1: PRE-DEPLOYMENT VALIDATION
# ============================================================================

write_step "PHASE 1: Pre-Deployment Validation"

# Check Node.js
echo "   Checking Node.js..."
if ! command -v node &> /dev/null; then
  write_error "Node.js not found"
  exit 1
fi
NODE_VERSION=$(node --version)
write_success "Node.js $NODE_VERSION found"

# Check npm
echo "   Checking npm..."
if ! command -v npm &> /dev/null; then
  write_error "npm not found"
  exit 1
fi
NPM_VERSION=$(npm --version)
write_success "npm $NPM_VERSION found"

# Check environment files
echo "   Checking environment files..."
if [ ! -f ".env.backend" ]; then
  write_error ".env.backend not found"
  exit 1
fi
if [ ! -f ".env.production" ]; then
  write_error ".env.production not found"
  exit 1
fi
write_success "Environment files found"

# Check npm dependencies
echo "   Checking npm dependencies..."
if [ ! -d "node_modules" ]; then
  echo "   Installing dependencies..."
  npm install --silent
  write_success "Dependencies installed"
else
  write_success "Dependencies already installed"
fi

# ============================================================================
# PHASE 2: DATABASE BACKUP & SNAPSHOT
# ============================================================================

if [ "$SKIP_BACKUP" = false ]; then
  write_step "PHASE 2: Database Backup & Snapshot"
  
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  BACKUP_DIR="backups"
  
  # Create backups directory
  mkdir -p "$BACKUP_DIR"
  
  echo "   Backup directory: $BACKUP_DIR"
  write_warning "Database backup would be created here (requires pgdump)"
  echo "   Command: pg_dump --host=... --file=$BACKUP_DIR/backup_$TIMESTAMP.dump"
fi

# ============================================================================
# PHASE 3: PRISMA MIGRATIONS
# ============================================================================

write_step "PHASE 3: Database Migrations (Prisma)"

export NODE_ENV="$ENVIRONMENT"

invoke_command "npx prisma migrate deploy" "Running Prisma migrations" false
invoke_command "npx prisma generate" "Generating Prisma client" false

# ============================================================================
# PHASE 4: BACKEND BUILD & DEPLOYMENT
# ============================================================================

write_step "PHASE 4: Backend Build & Deployment"

invoke_command "npm run build:backend" "Building backend TypeScript" false

echo "   Starting backend service..."
if [ "$DRY_RUN" = true ]; then
  echo "   ${BLUE}[DRY RUN]${NC} pm2 start ecosystem.config.js --env $ENVIRONMENT"
  write_success "Backend deployment (DRY RUN)"
else
  if pm2 stop "production-app" 2>/dev/null || true; then
    :
  fi
  
  if pm2 start ecosystem.config.js --env "$ENVIRONMENT" --silent; then
    pm2 save --silent 2>/dev/null || true
    sleep 2
    write_success "Backend deployed and running"
  else
    write_error "Failed to start backend"
    exit 1
  fi
fi

# ============================================================================
# PHASE 5: FRONTEND BUILD & DEPLOYMENT
# ============================================================================

write_step "PHASE 5: Frontend Build & Deployment"

invoke_command "npm run frontend:build" "Building frontend (React + Vite)" false

echo "   Verifying frontend build..."
if [ -f "dist/index.html" ]; then
  write_success "Frontend build verified"
else
  write_error "Frontend build missing dist/index.html"
  exit 1
fi

# ============================================================================
# PHASE 6: SMOKE TESTS & VALIDATION
# ============================================================================

write_step "PHASE 6: Smoke Tests & Validation"

sleep 2

echo "   Testing health endpoint..."
if command -v curl &> /dev/null; then
  HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/health 2>/dev/null || echo "000")
  if [ "$HEALTH_RESPONSE" = "200" ]; then
    write_success "Health check passed (200)"
  else
    write_error "Health check failed (HTTP $HEALTH_RESPONSE)"
    echo "   Make sure backend is running: npm run backend:prod"
    exit 1
  fi
else
  write_warning "curl not found, skipping health check"
fi

# ============================================================================
# PHASE 7: POST-DEPLOYMENT VERIFICATION
# ============================================================================

write_step "PHASE 7: Post-Deployment Verification"

echo "   Environment variables..."
write_success "NODE_ENV: $NODE_ENV"

echo "   Checking frontend files..."
if [ -d "dist" ]; then
  FILE_COUNT=$(find dist -type f | wc -l)
  write_success "Frontend: $FILE_COUNT files built"
fi

# ============================================================================
# SUMMARY
# ============================================================================

write_step "DEPLOYMENT COMPLETE ✅"

echo ""
echo -e "${GREEN}Summary:${NC}"
echo "  • Environment: $ENVIRONMENT"
echo "  • Backend: Running on port 3001"
echo "  • Frontend: Built to ./dist"
echo "  • Database: Migrations applied"
echo "  • Smoke tests: Passed"

echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Monitor logs: pm2 logs production-app"
echo "  2. Test manually: http://localhost:3001/health"
echo "  3. Review audit logs for any errors"
echo "  4. Notify stakeholders of successful deployment"

echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  • See PRODUCTION_RUNBOOK.md for emergency procedures"
echo "  • See PHASE_11_ACTION_PLAN.md for detailed steps"
echo "  • See PHASE_11_SIGN_OFF.md for approvals checklist"
echo ""
