#!/bin/bash
#
# Create Staging Branches in All Service Repositories
#
# This script creates a 'staging' branch in each of the 13 Sailor Skills service repositories
# and pushes it to GitHub.
#
# Usage: ./scripts/staging/create-staging-branches.sh

set -e

echo "🔄 Creating staging branches in all service repositories..."
echo ""

SERVICES=(
  "sailorskills-login"
  "sailorskills-operations"
  "sailorskills-billing"
  "sailorskills-portal"
  "sailorskills-estimator"
  "sailorskills-inventory"
  "sailorskills-insight"
  "sailorskills-settings"
  "sailorskills-video"
  "sailorskills-booking"
  "sailorskills-marketing"
  "sailorskills-site"
  "sailorskills-shared"
)

SUCCESS_COUNT=0
SKIP_COUNT=0
FAIL_COUNT=0

for service in "${SERVICES[@]}"; do
  echo "📦 Processing: $service"

  if [ ! -d "$service/.git" ]; then
    echo "   ⏭️  Skipped: Not a git repository"
    SKIP_COUNT=$((SKIP_COUNT + 1))
    echo ""
    continue
  fi

  cd "$service"

  # Check if staging branch already exists
  if git show-ref --verify --quiet refs/heads/staging; then
    echo "   ⏭️  staging branch already exists locally"
    cd ..
    SKIP_COUNT=$((SKIP_COUNT + 1))
    echo ""
    continue
  fi

  # Ensure we're on main and up to date
  git checkout main > /dev/null 2>&1
  git pull origin main > /dev/null 2>&1 || true

  # Create staging branch
  git checkout -b staging > /dev/null 2>&1

  # Push to origin
  if git push -u origin staging > /dev/null 2>&1; then
    echo "   ✅ staging branch created and pushed"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "   ❌ Failed to push staging branch"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi

  cd ..
  echo ""
done

echo "========================================"
echo "📊 Summary:"
echo "   ✅ Created: $SUCCESS_COUNT"
echo "   ⏭️  Skipped: $SKIP_COUNT"
echo "   ❌ Failed: $FAIL_COUNT"
echo "========================================"

if [ $SUCCESS_COUNT -gt 0 ]; then
  echo ""
  echo "✅ Staging branches are ready!"
  echo ""
  echo "Next steps:"
  echo "  1. Configure Vercel to deploy 'staging' branch for each service"
  echo "  2. Add staging environment variables in Vercel"
  echo "  3. Set up custom staging domains"
fi
