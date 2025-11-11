#!/bin/bash

# Sailorskills Service Status Checker
# Shows which services are currently running

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Service Status${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Function to check if a port is in use
check_port() {
    local port=$1
    local service_name=$2
    local url=$3

    if lsof -ti:$port &> /dev/null; then
        PID=$(lsof -ti:$port)
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ RUNNING${NC}  $service_name"
        echo -e "             Port: $port | PID: $PID | Process: $PROCESS"
        echo -e "             URL: ${BLUE}$url${NC}"
    else
        echo -e "${RED}✗ STOPPED${NC}  $service_name"
        echo -e "             Port: $port (free)"
    fi
    echo ""
}

# Check all services
echo "Frontend Services:"
echo "-------------------"
check_port 5174 "Portal (Customer)" "http://localhost:5174"
check_port 5173 "Billing" "http://localhost:5173"
check_port 5176 "Operations" "http://localhost:5176"
check_port 8080 "Dashboard (Insight)" "http://localhost:8080"
check_port 5175 "Estimator" "http://localhost:5175"
check_port 5177 "Inventory" "http://localhost:5177"
check_port 5178 "Booking (Frontend)" "http://localhost:5178"
check_port 5179 "Site (Marketing)" "http://localhost:5179"
check_port 5180 "Marketing (Alt)" "http://localhost:5180"

echo "Backend Services:"
echo "-------------------"
check_port 3001 "Booking API" "http://localhost:3001"
check_port 5000 "Video (BOATY)" "http://localhost:5000"

echo "Infrastructure:"
echo "-------------------"
check_port 54321 "Supabase (API)" "http://localhost:54321"
check_port 54323 "Supabase Studio" "http://localhost:54323"

# Summary
echo -e "${BLUE}================================${NC}"
RUNNING_COUNT=$(lsof -ti:5174,5173,5176,8080,5175,5177,5178,5179,5180,3001,5000,54321,54323 2>/dev/null | wc -l | xargs)
echo -e "Total services running: ${GREEN}$RUNNING_COUNT${NC}"
echo ""

# Helpful commands
echo "Quick Actions:"
echo "  Start all: ${BLUE}./scripts/start-dev.sh all${NC}"
echo "  Start core: ${BLUE}./scripts/start-dev.sh core${NC}"
echo "  Stop all: ${BLUE}./scripts/stop-all.sh${NC}"
echo ""
