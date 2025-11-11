#!/bin/bash

# Shared Package Sync Script for Sailorskills
# Initializes and updates the sailorskills-shared git submodule

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Shared Package Sync${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "services.json" ]; then
    echo -e "${RED}Error:${NC} Must run from sailorskills-repos root directory"
    exit 1
fi

# Initialize submodule if not already done
if [ ! -d "sailorskills-shared/.git" ]; then
    echo -e "${YELLOW}Initializing shared package submodule...${NC}"
    git submodule init sailorskills-shared
    git submodule update sailorskills-shared
    echo -e "${GREEN}✓${NC} Shared package initialized"
else
    echo -e "${GREEN}✓${NC} Shared package already initialized"
fi

# Update to latest version
echo ""
echo -e "${YELLOW}Updating shared package to latest version...${NC}"
git submodule update --remote sailorskills-shared

# Get the current commit hash
cd sailorskills-shared
COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_MSG=$(git log -1 --pretty=%B | head -n 1)
cd ..

echo -e "${GREEN}✓${NC} Shared package updated to: ${BLUE}$COMMIT_HASH${NC}"
echo -e "  Latest commit: $COMMIT_MSG"
echo ""

# Check if individual service shared folders are symlinks or need updates
echo -e "${YELLOW}Checking service shared package links...${NC}"

SERVICES=(
    "sailorskills-portal"
    "sailorskills-billing"
    "sailorskills-operations"
    "sailorskills-dashboard"
    "sailorskills-estimator"
    "sailorskills-inventory"
    "sailorskills-booking"
    "sailorskills-site"
    "sailorskills-marketing"
)

for service in "${SERVICES[@]}"; do
    if [ -d "$service" ]; then
        if [ -L "$service/shared" ]; then
            echo -e "${GREEN}✓${NC} $service/shared (symlink)"
        elif [ -d "$service/shared" ]; then
            # Check if it's a git submodule
            if [ -f "$service/shared/.git" ] || [ -d "$service/shared/.git" ]; then
                echo -e "${GREEN}✓${NC} $service/shared (submodule)"
            else
                echo -e "${YELLOW}⚠${NC}  $service/shared (regular directory - may need manual update)"
            fi
        else
            echo -e "${YELLOW}⚠${NC}  $service/shared (missing - may need initialization)"
        fi
    fi
done

echo ""
echo -e "${GREEN}✓ Shared package sync complete!${NC}"
echo ""
echo "Next steps:"
echo "  - Start development: ${BLUE}npm run dev:all${NC}"
echo "  - Or start specific services: ${BLUE}npm run dev:core${NC}"
echo ""
exit 0
