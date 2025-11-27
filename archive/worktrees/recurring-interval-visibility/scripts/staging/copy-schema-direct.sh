#!/bin/bash
#
# Direct Schema Copy (Version-Independent)
#
# This script copies the schema from production to staging using SQL queries
# instead of pg_dump, avoiding version mismatch issues.
#
# Usage: ./scripts/staging/copy-schema-direct.sh

set -e

# Load environment variables
if [ ! -f .env.staging ]; then
    echo "❌ Error: .env.staging not found"
    exit 1
fi

source <(grep -v '^#' .env.staging | sed 's/^/export /')

echo "🔄 Copying schema from production to staging..."
echo ""

# Step 1: Get list of all tables in production
echo "📋 Getting list of tables from production..."
TABLES=$(psql "$DATABASE_URL_PRODUCTION" -t -c "
SELECT string_agg(tablename, ' ')
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT LIKE 'sql_%';
")

echo "Found tables: $TABLES"
echo ""

# Step 2: Export schema for each table
echo "📦 Exporting CREATE TABLE statements..."
for table in $TABLES; do
    echo "  - $table"
    psql "$DATABASE_URL_PRODUCTION" -t -c "
    SELECT 'CREATE TABLE IF NOT EXISTS ' || schemaname || '.' || tablename || ' (' ||
           string_agg(column_name || ' ' || data_type, ', ') || ');'
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = '$table'
    GROUP BY schemaname, tablename;
    " >> scripts/staging/production-schema-simple.sql
done

echo ""
echo "✅ Schema export complete!"
echo "📄 Saved to: scripts/staging/production-schema-simple.sql"
echo ""
echo "Next: Apply to staging with:"
echo "  psql \"\$DATABASE_URL_STAGING\" -f scripts/staging/production-schema-simple.sql"
