#!/bin/bash

# Seed Local Supabase with Test Data
# Creates sample customers, boats, and other test data

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Local Data Seeder${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if Supabase is running
if ! lsof -ti:54321 &> /dev/null; then
    echo -e "${RED}Error:${NC} Local Supabase is not running"
    echo ""
    echo "Start it with:"
    echo "  ${BLUE}supabase start${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Local Supabase is running"
echo ""

# Set database URL for local Supabase
export DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"

echo -e "${YELLOW}Inserting seed data...${NC}"
echo ""

# Run seed SQL
psql "$DATABASE_URL" -f scripts/seed-local-data.sql

echo ""
echo -e "${GREEN}✓ Seed data inserted!${NC}"
echo ""
echo "You can now test with:"
echo "  - Customer: ${BLUE}test1@sailorskills.com${NC}"
echo "  - Customer: ${BLUE}test2@sailorskills.com${NC}"
echo "  - Customer: ${BLUE}standardhuman@gmail.com${NC}"
echo ""
echo "View data in Supabase Studio:"
echo "  ${BLUE}open http://localhost:54323${NC}"
echo ""
