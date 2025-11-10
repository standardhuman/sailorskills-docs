#!/usr/bin/env node
/**
 * Export Production Database Schema
 *
 * This script exports the complete schema from your production Supabase database
 * so it can be applied to the staging environment.
 *
 * Usage:
 *   node scripts/staging/export-production-schema.mjs
 *
 * Requirements:
 *   - Supabase CLI installed: npm install -g supabase
 *   - .env.staging file with DATABASE_URL_PRODUCTION set
 *
 * Output:
 *   - Creates: scripts/staging/production-schema.sql
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../');

// Load environment variables from .env.staging
function loadEnv() {
  try {
    const envPath = join(repoRoot, '.env.staging');
    const envContent = readFileSync(envPath, 'utf8');

    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        env[key.trim()] = valueParts.join('=').trim();
      }
    });

    return env;
  } catch (error) {
    console.error('❌ Error loading .env.staging file');
    console.error('Make sure you have copied .env.staging.template to .env.staging and filled in your credentials');
    process.exit(1);
  }
}

async function exportSchema() {
  console.log('🔄 Exporting production database schema...\n');

  const env = loadEnv();

  if (!env.DATABASE_URL_PRODUCTION) {
    console.error('❌ DATABASE_URL_PRODUCTION not set in .env.staging');
    console.error('Please add your production database URL to .env.staging');
    process.exit(1);
  }

  const outputFile = join(__dirname, 'production-schema.sql');

  try {
    // Export schema using pg_dump
    const command = `pg_dump "${env.DATABASE_URL_PRODUCTION}" \
      --schema=public \
      --schema-only \
      --no-owner \
      --no-privileges \
      --file="${outputFile}"`;

    console.log('📦 Running pg_dump...');
    await execAsync(command);

    console.log('✅ Schema exported successfully!');
    console.log(`📄 Saved to: ${outputFile}`);
    console.log('\nNext step: Run apply-schema-to-staging.mjs to apply this schema to staging');

  } catch (error) {
    console.error('❌ Error exporting schema:');
    console.error(error.message);
    process.exit(1);
  }
}

exportSchema();
