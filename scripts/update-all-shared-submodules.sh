#!/bin/bash
# Update shared submodule across all services

SERVICES=(
    "sailorskills-billing"
    "sailorskills-portal"
    "sailorskills-inventory"
    "sailorskills-video"
    "sailorskills-booking"
    "sailorskills-estimator"
    "sailorskills-insight"
    "sailorskills-marketing"
    "sailorskills-settings"
)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Updating shared submodule in all services..."
echo "Root: $ROOT_DIR"
echo ""

for service in "${SERVICES[@]}"; do
    SERVICE_PATH="$ROOT_DIR/$service"
    SHARED_PATH="$SERVICE_PATH/shared"

    if [ -d "$SHARED_PATH" ]; then
        echo "→ Updating $service..."
        cd "$SHARED_PATH"
        git pull origin main > /dev/null 2>&1
        cd "$SERVICE_PATH"
        git add shared
        git commit -m "chore: update shared submodule to latest (navigation optimization)" > /dev/null 2>&1
        echo "  ✓ Updated and committed"
    else
        echo "→ Skipping $service (no shared submodule)"
    fi
done

echo ""
echo "✓ All services updated!"
