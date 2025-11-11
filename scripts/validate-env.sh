#!/bin/bash

# Environment Validation Script for Sailorskills Local Development
# Checks that all required environment variables are set before starting services

# Note: Don't use 'set -e' because check_optional returns 1 for missing optional vars
# which is expected behavior and shouldn't exit the script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
MISSING_COUNT=0
OPTIONAL_MISSING_COUNT=0
TOTAL_CHECKS=0

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Environment Validation${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to check required variable
check_required() {
    local var_name=$1
    local description=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ -z "${!var_name}" ]; then
        echo -e "${RED}✗ MISSING:${NC} $var_name - $description"
        MISSING_COUNT=$((MISSING_COUNT + 1))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name"
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name=$1
    local description=$2
    local used_by=$3

    if [ -z "${!var_name}" ]; then
        echo -e "${YELLOW}⚠${NC}  $var_name (optional) - $description - Used by: $used_by"
        OPTIONAL_MISSING_COUNT=$((OPTIONAL_MISSING_COUNT + 1))
        return 1
    else
        echo -e "${GREEN}✓${NC} $var_name"
        return 0
    fi
}

echo -e "${BLUE}Checking REQUIRED environment variables...${NC}"
echo ""

# Core Supabase (required by all services)
echo "=== Core Infrastructure ==="
check_required "VITE_SUPABASE_URL" "Supabase project URL"
check_required "VITE_SUPABASE_ANON_KEY" "Supabase anon/public key"
echo ""

# Check if using local or remote Supabase
if [[ "$VITE_SUPABASE_URL" == *"localhost"* ]]; then
    echo -e "${GREEN}✓${NC} Detected LOCAL Supabase configuration"
    echo -e "  Make sure Supabase CLI is running: ${BLUE}supabase status${NC}"
else
    echo -e "${GREEN}✓${NC} Detected REMOTE Supabase configuration"
fi
echo ""

# Service-specific required variables
echo "=== Billing & Operations (admin services) ==="
check_required "SUPABASE_SERVICE_KEY" "Supabase service role key (admin access)"
echo ""

echo "=== Stripe (payment processing) ==="
check_required "VITE_STRIPE_PUBLISHABLE_KEY" "Stripe publishable key"
check_required "STRIPE_SECRET_KEY" "Stripe secret key"
echo ""

echo -e "${BLUE}Checking OPTIONAL environment variables...${NC}"
echo ""

echo "=== Google APIs ==="
check_optional "VITE_GOOGLE_CLIENT_ID" "Google OAuth client ID" "Booking"
check_optional "VITE_GOOGLE_API_KEY" "Google API key" "Booking"
check_optional "GOOGLE_CLIENT_SECRET" "Google OAuth secret" "Booking"
echo ""

echo "=== AI / Gemini ==="
check_optional "VITE_GEMINI_API_KEY" "Google Gemini API key" "Inventory, Marketing"
echo ""

echo "=== Notion Integration ==="
check_optional "NOTION_API_KEY" "Notion API key" "Billing, Operations"
echo ""

echo "=== Inventory ==="
check_optional "VITE_INVENTORY_PASSWORD_HASH" "Inventory password hash" "Inventory"
check_optional "VITE_INVENTORY_API_URL" "Inventory API URL" "Operations"
echo ""

echo "=== Email ==="
check_optional "RESEND_API_KEY" "Resend email API key" "Estimator, Billing"
check_optional "EMAIL_FROM_ADDRESS" "Email from address" "Estimator, Billing"
echo ""

echo "=== GitHub ==="
check_optional "GITHUB_TOKEN" "GitHub personal access token" "Marketing"
echo ""

echo "=== Webhooks ==="
check_optional "STRIPE_WEBHOOK_SECRET" "Stripe webhook signing secret" "Billing, Estimator"
echo ""

echo "=== Database ==="
check_optional "DATABASE_URL" "Direct database connection string" "Testing, Migrations"
echo ""

# Summary
echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}================================${NC}"

if [ $MISSING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All required environment variables are set!${NC}"
else
    echo -e "${RED}✗ $MISSING_COUNT required variable(s) are missing${NC}"
fi

if [ $OPTIONAL_MISSING_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠  $OPTIONAL_MISSING_COUNT optional variable(s) are missing${NC}"
    echo -e "   (Some features may not work without these)"
fi

echo ""

# Exit with error if any required variables are missing
if [ $MISSING_COUNT -gt 0 ]; then
    echo -e "${RED}ERROR:${NC} Cannot start development environment with missing required variables"
    echo ""
    echo "To fix:"
    echo "  1. Copy .env.example to .env.local"
    echo "  2. Fill in the missing values"
    echo "  3. Run: ${BLUE}source .env.local${NC} (or restart your terminal)"
    echo ""
    exit 1
fi

echo -e "${GREEN}Environment validation passed!${NC}"
echo "You can now start services with: ${BLUE}npm run dev:all${NC}"
echo ""
exit 0
