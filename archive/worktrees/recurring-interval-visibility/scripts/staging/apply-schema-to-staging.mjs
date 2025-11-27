#!/usr/bin/env node
/**
 * Apply Production Schema to Staging Database
 *
 * This script takes the exported production schema and applies it to
 * your staging Supabase database.
 *
 * Usage:
 *   node scripts/staging/apply-schema-to-staging.mjs
 *
 * Requirements:
 *   - .env.staging file with DATABASE_URL_STAGING set
 *   - production-schema.sql file (created by export-production-schema.mjs)
 *
 * Safety:
 *   - This will DROP existing tables in staging public schema
 *   - Only run this on a fresh staging database or when you want to reset it
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer);
  }));
}

async function applySchema() {
  console.log('🔄 Applying production schema to staging database...\n');

  const env = loadEnv();
  const schemaFile = join(__dirname, 'production-schema.sql');

  // Validation
  if (!env.DATABASE_URL_STAGING) {
    console.error('❌ DATABASE_URL_STAGING not set in .env.staging');
    console.error('Please add your staging database URL to .env.staging');
    process.exit(1);
  }

  if (!existsSync(schemaFile)) {
    console.error('❌ production-schema.sql not found');
    console.error('Please run export-production-schema.mjs first');
    process.exit(1);
  }

  // Safety confirmation
  console.log('⚠️  WARNING: This will replace the staging database schema');
  console.log('   Database:', env.DATABASE_URL_STAGING.replace(/:[^:@]+@/, ':***@'));
  console.log('   Schema file:', schemaFile);
  console.log('');

  const answer = await askQuestion('Are you sure you want to continue? (yes/no): ');

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Aborted');
    process.exit(0);
  }

  try {
    console.log('\n📦 Applying schema...');

    // Apply schema using psql
    const command = `psql "${env.DATABASE_URL_STAGING}" -f "${schemaFile}"`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('NOTICE')) {
      console.error('⚠️  Warnings:', stderr);
    }

    console.log('✅ Schema applied successfully!');
    console.log('\n📋 Summary:');
    console.log('   - All tables, views, and functions created');
    console.log('   - RLS policies applied');
    console.log('   - Indexes created');
    console.log('\nNext steps:');
    console.log('   1. Run seed-staging-data.mjs to add test data');
    console.log('   2. Test database connection with your staging Supabase URL');

  } catch (error) {
    console.error('❌ Error applying schema:');
    console.error(error.message);
    if (error.stderr) {
      console.error('\nDetails:', error.stderr);
    }
    process.exit(1);
  }
}

applySchema();
