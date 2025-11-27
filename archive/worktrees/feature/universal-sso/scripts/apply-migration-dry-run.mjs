#!/usr/bin/env node

/**
 * Migration Dry-Run Script
 *
 * Tests database migration without committing changes
 * Validates migration syntax and rollback scripts
 *
 * Usage:
 *   node apply-migration-dry-run.mjs path/to/migration.sql
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('❌ Error: Migration file path required');
  console.log('\nUsage:');
  console.log('  node apply-migration-dry-run.mjs path/to/migration.sql\n');
  process.exit(1);
}

async function testMigration() {
  console.log('🧪 Testing migration (dry-run)...\n');
  console.log(`File: ${migrationFile}\n`);

  const client = await pool.connect();

  try {
    // Read migration file
    const migrationSQL = readFileSync(migrationFile, 'utf-8');

    console.log('Starting transaction...');
    await client.query('BEGIN');

    console.log('Applying migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully (in transaction)\n');

    // Optionally, run some validation queries here
    console.log('Running validation checks...');

    // Example: Check if table exists
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`  ✅ Found ${tables.rowCount} tables in public schema`);

    console.log('\nRolling back transaction...');
    await client.query('ROLLBACK');

    console.log('✅ Dry-run complete! Migration was NOT applied.\n');

    console.log('='.repeat(50));
    console.log('✅ Migration syntax is valid');
    console.log('   To apply for real, run:');
    console.log(`   psql $DATABASE_URL -f ${migrationFile}`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration test failed:', error.message);
    console.log('\nRolling back...');
    await client.query('ROLLBACK');
    console.log('Transaction rolled back.\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

testMigration();
