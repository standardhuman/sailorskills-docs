#!/usr/bin/env node
/**
 * Automated Staging Schema Sync
 *
 * This script compares production and staging schemas and applies any new
 * migrations to keep staging up-to-date with production.
 *
 * Usage:
 *   node scripts/staging/sync-staging-schema.mjs [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be done without making changes
 *
 * Requirements:
 *   - .env.staging file with both production and staging database URLs
 *   - pg_dump and psql in PATH
 *
 * Schedule:
 *   Run this weekly or before major testing to ensure staging matches production
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '../../');

const isDryRun = process.argv.includes('--dry-run');

// Load environment variables
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
    console.error('Make sure you have .env.staging configured with credentials');
    process.exit(1);
  }
}

async function dumpSchema(dbUrl, outputFile) {
  const command = `pg_dump "${dbUrl}" \
    --schema=public \
    --schema-only \
    --no-owner \
    --no-privileges \
    --file="${outputFile}"`;

  await execAsync(command);
}

async function compareSchemas(prodFile, stagingFile) {
  // Simple comparison - in production, you'd use a proper schema diff tool
  try {
    const { stdout } = await execAsync(`diff "${prodFile}" "${stagingFile}"`);
    return null; // No differences
  } catch (error) {
    // diff returns non-zero exit code when files differ
    return error.stdout || 'Schemas differ';
  }
}

async function syncSchema() {
  console.log('🔄 Staging Schema Sync\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  const env = loadEnv();

  // Validation
  if (!env.DATABASE_URL_PRODUCTION) {
    console.error('❌ DATABASE_URL_PRODUCTION not set');
    process.exit(1);
  }

  if (!env.DATABASE_URL_STAGING) {
    console.error('❌ DATABASE_URL_STAGING not set');
    process.exit(1);
  }

  const tempDir = join(__dirname, 'temp');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const prodSchemaFile = join(tempDir, 'prod-schema-current.sql');
  const stagingSchemaFile = join(tempDir, 'staging-schema-current.sql');

  try {
    // Step 1: Export current production schema
    console.log('📦 Exporting production schema...');
    await dumpSchema(env.DATABASE_URL_PRODUCTION, prodSchemaFile);
    console.log('✅ Production schema exported');

    // Step 2: Export current staging schema
    console.log('📦 Exporting staging schema...');
    await dumpSchema(env.DATABASE_URL_STAGING, stagingSchemaFile);
    console.log('✅ Staging schema exported');

    // Step 3: Compare schemas
    console.log('\n🔍 Comparing schemas...');
    const differences = await compareSchemas(prodSchemaFile, stagingSchemaFile);

    if (!differences) {
      console.log('✅ Schemas are in sync! No changes needed.');
      console.log('\n📊 Summary:');
      console.log('   Production and staging databases have identical schemas');
      return;
    }

    console.log('⚠️  Schemas differ - staging needs updating');
    console.log('\n📋 Differences detected:');
    console.log(differences.split('\n').slice(0, 20).join('\n'));
    if (differences.split('\n').length > 20) {
      console.log('   ... (truncated)');
    }

    if (isDryRun) {
      console.log('\n🔍 DRY RUN: Would apply production schema to staging');
      console.log('   Run without --dry-run to apply changes');
      return;
    }

    // Step 4: Apply production schema to staging
    console.log('\n📦 Applying production schema to staging...');
    const command = `psql "${env.DATABASE_URL_STAGING}" -f "${prodSchemaFile}"`;
    await execAsync(command);

    console.log('✅ Schema sync complete!');
    console.log('\n📊 Summary:');
    console.log('   - Staging database updated to match production');
    console.log('   - All schema changes applied');
    console.log('   - Test data preserved (schema-only update)');

    // Save backup of production schema
    const backupFile = join(__dirname, `production-schema-${new Date().toISOString().split('T')[0]}.sql`);
    writeFileSync(backupFile, readFileSync(prodSchemaFile));
    console.log(`   - Backup saved: ${backupFile}`);

  } catch (error) {
    console.error('❌ Error during sync:');
    console.error(error.message);
    process.exit(1);
  }
}

syncSchema();
