#!/bin/bash

# Sailorskills Development Environment Starter
# Performs pre-flight checks and starts all or specified services

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default mode
MODE="${1:-all}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Development Starter${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "services.json" ]; then
    echo -e "${RED}Error:${NC} Must run from sailorskills-repos root directory"
    exit 1
fi

echo -e "${YELLOW}Step 1/5: Checking prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found - please install Node.js"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Python (for video service)
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
    else
        PYTHON_VERSION=$(python --version)
    fi
    echo -e "${GREEN}✓${NC} Python $PYTHON_VERSION"
else
    echo -e "${YELLOW}⚠${NC}  Python not found - video service will not start"
fi

# Check Supabase CLI (optional for local development)
if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version)
    echo -e "${GREEN}✓${NC} Supabase CLI $SUPABASE_VERSION"
else
    echo -e "${YELLOW}⚠${NC}  Supabase CLI not found - using remote Supabase only"
    echo -e "   Install with: ${BLUE}brew install supabase/tap/supabase${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2/5: Syncing shared package...${NC}"
./scripts/sync-shared.sh || {
    echo -e "${YELLOW}⚠${NC}  Shared package sync had warnings - continuing anyway"
}

echo ""
echo -e "${YELLOW}Step 3/5: Loading environment variables...${NC}"

if [ -f ".env.local" ]; then
    set -a  # automatically export all variables
    source .env.local
    set +a
    echo -e "${GREEN}✓${NC} Environment loaded from .env.local"
else
    echo -e "${YELLOW}⚠${NC}  No .env.local found"
    echo -e "   Create one from template: ${BLUE}cp .env.example .env.local${NC}"
    echo -e "   Continuing with system environment variables..."
fi

echo ""
echo -e "${YELLOW}Step 4/5: Validating environment...${NC}"
./scripts/validate-env.sh || {
    echo -e "${RED}✗${NC} Environment validation failed"
    echo ""
    echo "Fix the issues above and try again"
    exit 1
}

echo ""
echo -e "${YELLOW}Step 5/5: Starting services...${NC}"

case "$MODE" in
    all)
        echo -e "Starting ${BLUE}ALL services${NC}..."
        echo ""
        npm run dev:all
        ;;
    core)
        echo -e "Starting ${BLUE}CORE services${NC} (Portal, Billing, Operations, Dashboard)..."
        echo ""
        npm run dev:core
        ;;
    frontend)
        echo -e "Starting ${BLUE}ALL FRONTEND services${NC}..."
        echo ""
        npm run dev:frontend
        ;;
    admin)
        echo -e "Starting ${BLUE}ADMIN services${NC} (Billing, Operations, Dashboard, Inventory)..."
        echo ""
        npm run dev:admin
        ;;
    customer)
        echo -e "Starting ${BLUE}CUSTOMER-FACING services${NC} (Portal, Estimator, Booking, Site, Marketing)..."
        echo ""
        npm run dev:customer-facing
        ;;
    db)
        echo -e "Starting ${BLUE}LOCAL SUPABASE${NC}..."
        echo ""
        npm run dev:db
        ;;
    *)
        echo -e "${RED}Error:${NC} Unknown mode: $MODE"
        echo ""
        echo "Usage: $0 [mode]"
        echo ""
        echo "Modes:"
        echo "  all       - Start all services (default)"
        echo "  core      - Portal, Billing, Operations, Dashboard"
        echo "  frontend  - All frontend services"
        echo "  admin     - Admin-only services"
        echo "  customer  - Customer-facing services"
        echo "  db        - Local Supabase only"
        echo ""
        echo "Or use npm scripts directly:"
        echo "  npm run dev:portal"
        echo "  npm run dev:billing"
        echo "  etc."
        exit 1
        ;;
esac
