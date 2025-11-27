#!/bin/bash

# Sailorskills Development Environment Stopper
# Gracefully stops all running development services

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Sailorskills Service Stopper${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

echo -e "${YELLOW}Stopping all Sailorskills services...${NC}"
echo ""

# Kill all node processes running vite
echo "Stopping Vite dev servers..."
pkill -f "vite" && echo -e "${GREEN}✓${NC} Stopped Vite servers" || echo -e "${YELLOW}⚠${NC}  No Vite servers running"

# Kill booking API server
echo "Stopping Booking API server..."
pkill -f "sailorskills-booking/server.js" && echo -e "${GREEN}✓${NC} Stopped Booking API" || echo -e "${YELLOW}⚠${NC}  Booking API not running"

# Kill Flask (video service)
echo "Stopping Video service (Flask)..."
pkill -f "sailorskills-video/app.py" && echo -e "${GREEN}✓${NC} Stopped Video service" || echo -e "${YELLOW}⚠${NC}  Video service not running"

# Kill concurrently processes
echo "Stopping concurrently orchestration..."
pkill -f "concurrently" && echo -e "${GREEN}✓${NC} Stopped concurrently" || echo -e "${YELLOW}⚠${NC}  No concurrently processes running"

# Stop local Supabase if running
if command -v supabase &> /dev/null; then
    echo "Stopping local Supabase..."
    supabase stop && echo -e "${GREEN}✓${NC} Stopped Supabase" || echo -e "${YELLOW}⚠${NC}  Supabase not running"
else
    echo -e "${YELLOW}⚠${NC}  Supabase CLI not installed - skipping"
fi

echo ""
echo -e "${GREEN}✓ All services stopped${NC}"
echo ""

# Show any remaining processes on our ports
echo "Checking for processes still using Sailorskills ports..."
PORTS_TO_CHECK=(5000 5173 5174 5175 5176 5177 5178 5179 5180 3001 8080 54321 54323)
FOUND_PROCESSES=0

for port in "${PORTS_TO_CHECK[@]}"; do
    if lsof -ti:$port &> /dev/null; then
        PID=$(lsof -ti:$port)
        PROCESS=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
        echo -e "${YELLOW}⚠${NC}  Port $port still in use by: $PROCESS (PID: $PID)"
        FOUND_PROCESSES=$((FOUND_PROCESSES + 1))
    fi
done

if [ $FOUND_PROCESSES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All Sailorskills ports are free"
else
    echo ""
    echo "To manually kill remaining processes:"
    echo "  ${BLUE}lsof -ti:[PORT] | xargs kill${NC}"
fi

echo ""
