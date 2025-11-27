#!/bin/bash
# Database Environment Setup for Sailorskills Repos
#
# Usage: source db-env.sh
# Or add to your shell: source /Users/brian/app-development/sailorskills-repos/db-env.sh
#
# This makes DATABASE_URL available in your shell for psql and other database tools

export DATABASE_URL="postgresql://postgres.fzygakldvvzxmahkdylq:hy9hiH%3FhB-6VaQP@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

echo "✓ DATABASE_URL loaded for Sailorskills database"
echo "  You can now use: psql \"\$DATABASE_URL\" -c \"SELECT 1\""
