#!/usr/bin/env node
/**
 * Seed Staging Database with Test Data
 *
 * This script populates your staging database with realistic test data
 * including customers, boats, service logs, invoices, bookings, and inventory.
 *
 * Usage:
 *   node scripts/staging/seed-staging-data.mjs
 *
 * Requirements:
 *   - .env.staging file with DATABASE_URL_STAGING set
 *   - Staging database schema already applied
 *
 * What it creates:
 *   - 5 test customers
 *   - 7 test boats
 *   - 5 historical service logs
 *   - 5 test invoices (various statuses)
 *   - 4 upcoming bookings
 *   - 5 inventory items
 *
 * Note: Test users must be created manually in Supabase Dashboard
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

async function seedData() {
  console.log('🌱 Seeding staging database with test data...\n');

  const env = loadEnv();

  if (!env.DATABASE_URL_STAGING) {
    console.error('❌ DATABASE_URL_STAGING not set in .env.staging');
    console.error('Please add your staging database URL to .env.staging');
    process.exit(1);
  }

  const sqlFile = join(__dirname, 'seed-staging-data.sql');

  try {
    console.log('📦 Running seed script...');

    const command = `psql "${env.DATABASE_URL_STAGING}" -f "${sqlFile}"`;
    const { stdout, stderr } = await execAsync(command);

    // Display output
    if (stdout) {
      console.log(stdout);
    }

    if (stderr && !stderr.includes('NOTICE')) {
      console.error('⚠️  Warnings:', stderr);
    }

    console.log('\n✅ Test data seeded successfully!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Create test users in Supabase Dashboard → Authentication:');
    console.log('      - test-admin@sailorskills.com (password: TestAdmin123!)');
    console.log('      - test-customer@sailorskills.com (password: TestCustomer123!)');
    console.log('      - test-field@sailorskills.com (password: TestField123!)');
    console.log('');
    console.log('   2. Test login with these credentials at:');
    console.log('      https://login-staging.sailorskills.com');
    console.log('');
    console.log('   3. Verify data appears in staging services:');
    console.log('      - Customers: https://ops-staging.sailorskills.com');
    console.log('      - Invoices: https://billing-staging.sailorskills.com');
    console.log('      - Portal: https://portal-staging.sailorskills.com');

  } catch (error) {
    console.error('❌ Error seeding data:');
    console.error(error.message);
    if (error.stderr) {
      console.error('\nDetails:', error.stderr);
    }
    process.exit(1);
  }
}

seedData();
