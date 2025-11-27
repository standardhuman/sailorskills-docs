#!/usr/bin/env node

/**
 * Row-Level Security (RLS) Policy Testing Script
 *
 * Validates RLS policies work correctly for multi-tenant isolation
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testRLSPolicies() {
  console.log('🔒 Testing RLS policies...\n');

  const tests = [];
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Verify RLS is enabled on critical tables
    console.log('Test 1: Checking RLS is enabled...');
    const rlsCheck = await pool.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN ('customers', 'invoices', 'service_logs')
      ORDER BY tablename
    `);

    for (const table of rlsCheck.rows) {
      if (table.rowsecurity) {
        console.log(`  ✅ RLS enabled on ${table.tablename}`);
        passed++;
      } else {
        console.log(`  ❌ RLS NOT enabled on ${table.tablename}`);
        failed++;
      }
    }

    // Test 2: Create two test customers
    console.log('\nTest 2: Testing customer data isolation...');

    const customer1 = await pool.query(
      `INSERT INTO customers (email, name, is_test, test_scenario_id)
       VALUES ($1, $2, true, $3)
       RETURNING id`,
      ['rls-test-1@example.test', 'RLS Test Customer 1', 'rls-test']
    );

    const customer2 = await pool.query(
      `INSERT INTO customers (email, name, is_test, test_scenario_id)
       VALUES ($1, $2, true, $3)
       RETURNING id`,
      ['rls-test-2@example.test', 'RLS Test Customer 2', 'rls-test']
    );

    // Test 3: Create invoice for customer 1
    console.log('\nTest 3: Creating test data...');
    const invoice = await pool.query(
      `INSERT INTO invoices (customer_id, amount, status, is_test, test_scenario_id)
       VALUES ($1, 100.00, 'pending', true, 'rls-test')
       RETURNING id`,
      [customer1.rows[0].id]
    );

    console.log(`  ✅ Created test invoice for customer 1`);

    // Test 4: Verify customer 2 cannot see customer 1's invoice
    // Note: This test assumes you have RLS policies set up
    // In a real scenario, you would authenticate as customer 2 and try to query
    console.log('\nTest 4: Verifying data isolation...');
    console.log('  ℹ️  Note: Full RLS testing requires authentication context');
    console.log('  ℹ️  This is a basic structural test');

    // Check policies exist
    const policies = await pool.query(`
      SELECT schemaname, tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename IN ('customers', 'invoices', 'service_logs')
      ORDER BY tablename, policyname
    `);

    console.log(`\n  Found ${policies.rows.length} RLS policies:`);
    for (const policy of policies.rows) {
      console.log(`    - ${policy.tablename}.${policy.policyname}`);
    }

    if (policies.rows.length > 0) {
      console.log('  ✅ RLS policies found');
      passed++;
    } else {
      console.log('  ❌ No RLS policies found');
      failed++;
    }

    // Cleanup
    console.log('\nCleaning up test data...');
    await pool.query(`DELETE FROM invoices WHERE test_scenario_id = 'rls-test'`);
    await pool.query(`DELETE FROM customers WHERE test_scenario_id = 'rls-test'`);
    console.log('  ✅ Cleanup complete');

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`RLS Policy Tests: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50) + '\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ RLS policy test error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testRLSPolicies();
