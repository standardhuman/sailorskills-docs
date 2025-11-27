#!/usr/bin/env node

/**
 * Create Test Data Script
 *
 * Generates test data for testing (customers, services, invoices, etc.)
 * All data tagged with is_test=true and test_scenario_id for easy cleanup
 */

import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const TEST_SCENARIO_ID = process.env.TEST_SCENARIO_ID || `test-${Date.now()}`;

async function createTestData() {
  console.log('📝 Creating test data...\n');
  console.log(`Test Scenario ID: ${TEST_SCENARIO_ID}\n`);

  try {
    // Create test customers
    console.log('Creating test customers...');
    const customers = [];

    for (let i = 1; i <= 3; i++) {
      const result = await pool.query(
        `INSERT INTO customers (email, name, phone, is_test, test_scenario_id)
         VALUES ($1, $2, $3, true, $4)
         RETURNING *`,
        [
          `test-customer-${i}-${Date.now()}@example.test`,
          `Test Customer ${i}`,
          `555-000-${1000 + i}`,
          TEST_SCENARIO_ID
        ]
      );
      customers.push(result.rows[0]);
      console.log(`  ✅ Created customer: ${result.rows[0].email}`);
    }

    // Create test service logs
    console.log('\nCreating test service logs...');
    const serviceLogs = [];

    for (const customer of customers) {
      const result = await pool.query(
        `INSERT INTO service_logs (customer_id, service_type, status, is_test, test_scenario_id)
         VALUES ($1, $2, $3, true, $4)
         RETURNING *`,
        [
          customer.id,
          'Test Service - Bottom Cleaning',
          'completed',
          TEST_SCENARIO_ID
        ]
      );
      serviceLogs.push(result.rows[0]);
      console.log(`  ✅ Created service log for customer ${customer.name}`);
    }

    // Create test invoices
    console.log('\nCreating test invoices...');
    const invoices = [];

    for (const customer of customers) {
      const result = await pool.query(
        `INSERT INTO invoices (customer_id, amount, status, is_test, test_scenario_id)
         VALUES ($1, $2, $3, true, $4)
         RETURNING *`,
        [
          customer.id,
          Math.floor(Math.random() * 500) + 100, // Random amount between $100-$600
          ['pending', 'paid', 'overdue'][Math.floor(Math.random() * 3)],
          TEST_SCENARIO_ID
        ]
      );
      invoices.push(result.rows[0]);
      console.log(`  ✅ Created invoice for customer ${customer.name}: $${result.rows[0].amount}`);
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log(`✅ Test data created successfully!`);
    console.log(`   - ${customers.length} customers`);
    console.log(`   - ${serviceLogs.length} service logs`);
    console.log(`   - ${invoices.length} invoices`);
    console.log(`\nTest Scenario ID: ${TEST_SCENARIO_ID}`);
    console.log(`\nTo clean up this data, run:`);
    console.log(`  TEST_SCENARIO_ID=${TEST_SCENARIO_ID} node scripts/cleanup-test-data.mjs`);
    console.log('='.repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTestData();
