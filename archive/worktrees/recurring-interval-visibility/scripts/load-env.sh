#!/bin/bash

# Environment Loader for Sailorskills Local Development
# Loads environment variables from .env.local
# Usage: source scripts/load-env.sh

# Colors for output
BLUE='\033[0;34m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Find .env.local file
ENV_FILE=".env.local"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error:${NC} $ENV_FILE not found"
    echo ""
    echo "To create it:"
    echo "  1. Copy the example: ${BLUE}cp .env.example .env.local${NC}"
    echo "  2. Edit .env.local and fill in your values"
    echo "  3. Run: ${BLUE}source scripts/load-env.sh${NC}"
    echo ""
    return 1
fi

# Load environment variables
set -a  # automatically export all variables
source "$ENV_FILE"
set +a

echo -e "${GREEN}✓${NC} Environment variables loaded from $ENV_FILE"
echo ""
echo "To validate your configuration, run:"
echo "  ${BLUE}./scripts/validate-env.sh${NC}"
echo ""

return 0
