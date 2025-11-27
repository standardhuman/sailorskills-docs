#!/usr/bin/env node

/**
 * Cleanup Test Data Script
 *
 * Removes test data by scenario ID or all test data
 * Usage:
 *   TEST_SCENARIO_ID=test-123 node cleanup-test-data.mjs  # Clean specific scenario
 *   CLEANUP_ALL=true node cleanup-test-data.mjs           # Clean ALL test data
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TEST_SCENARIO_ID = process.env.TEST_SCENARIO_ID;
const CLEANUP_ALL = process.env.CLEANUP_ALL === 'true';

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  if (!TEST_SCENARIO_ID && !CLEANUP_ALL) {
    console.error('❌ Error: Must provide TEST_SCENARIO_ID or CLEANUP_ALL=true');
    console.log('\nUsage:');
    console.log('  TEST_SCENARIO_ID=test-123 node cleanup-test-data.mjs');
    console.log('  CLEANUP_ALL=true node cleanup-test-data.mjs\n');
    process.exit(1);
  }

  try {
    let whereClause;
    let params = [];

    if (CLEANUP_ALL) {
      console.log('⚠️  WARNING: Cleaning up ALL test data...\n');
      whereClause = 'is_test = true';
    } else {
      console.log(`Cleaning up test scenario: ${TEST_SCENARIO_ID}\n`);
      whereClause = 'test_scenario_id = $1';
      params = [TEST_SCENARIO_ID];
    }

    // Delete in correct order (respect foreign keys)
    const tables = ['invoices', 'service_logs', 'boats', 'customers'];
    const deleted = {};

    for (const table of tables) {
      const result = await pool.query(
        `DELETE FROM ${table} WHERE ${whereClause} RETURNING id`,
        params
      );
      deleted[table] = result.rowCount;
      console.log(`  ✅ Deleted ${result.rowCount} records from ${table}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test data cleanup complete!');
    Object.entries(deleted).forEach(([table, count]) => {
      console.log(`   - ${table}: ${count} records`);
    });
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

cleanupTestData();
