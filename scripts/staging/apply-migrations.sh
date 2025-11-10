#!/bin/bash
#
# Apply Existing Migrations to Staging Database
#
# This script applies all existing Supabase migrations to the staging database.
# Simpler than using pg_dump and avoids version mismatch issues.
#
# Usage: ./scripts/staging/apply-migrations.sh

set -e

echo "🔄 Applying migrations to staging database..."
echo ""

# Load DATABASE_URL_STAGING from .env.staging
if [ ! -f .env.staging ]; then
    echo "❌ Error: .env.staging not found"
    exit 1
fi

# Extract DATABASE_URL_STAGING
DATABASE_URL_STAGING=$(grep "^DATABASE_URL_STAGING=" .env.staging | cut -d'=' -f2-)

if [ -z "$DATABASE_URL_STAGING" ]; then
    echo "❌ Error: DATABASE_URL_STAGING not set in .env.staging"
    exit 1
fi

echo "📂 Found migrations in: sailorskills-site/supabase/migrations/"
echo ""

# Count migrations
MIGRATION_COUNT=$(ls -1 sailorskills-site/supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "📋 Found $MIGRATION_COUNT migration files"
echo ""

# Apply each migration
SUCCESS_COUNT=0
FAIL_COUNT=0

for migration in sailorskills-site/supabase/migrations/*.sql; do
    MIGRATION_NAME=$(basename "$migration")
    echo "📦 Applying: $MIGRATION_NAME"

    if psql "$DATABASE_URL_STAGING" -f "$migration" -v ON_ERROR_STOP=1 > /tmp/migration-output.log 2>&1; then
        echo "   ✅ Success"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "   ❌ Failed - see error below:"
        cat /tmp/migration-output.log | head -10
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi
    echo ""
done

echo "========================================"
echo "📊 Migration Summary:"
echo "   ✅ Successful: $SUCCESS_COUNT"
echo "   ❌ Failed: $FAIL_COUNT"
echo "   📝 Total: $MIGRATION_COUNT"
echo "========================================"

if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo "⚠️  Some migrations failed. This might be expected if:"
    echo "   - Tables already exist (CREATE IF NOT EXISTS will skip)"
    echo "   - Migrations have already been applied"
    echo "   - Schema differences between environments"
    exit 0
fi

echo ""
echo "✅ All migrations applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Seed test data: node scripts/staging/seed-staging-data.mjs"
echo "  2. Verify tables exist: psql \"\$DATABASE_URL_STAGING\" -c \"\\dt\""
