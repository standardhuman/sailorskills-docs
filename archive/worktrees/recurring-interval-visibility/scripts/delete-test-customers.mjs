#!/usr/bin/env node

/**
 * Delete Test Customers
 * Removes test customers from the database that don't have boats
 *
 * Usage:
 *   node scripts/delete-test-customers.mjs          # Dry run (shows what will be deleted)
 *   DRY_RUN=false node scripts/delete-test-customers.mjs  # Actually delete
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = process.env.DRY_RUN !== 'false';

/**
 * Identify test customers by patterns
 */
function isTestCustomer(customer) {
  const name = customer.name || '';
  const email = customer.email || '';

  // Test patterns
  const patterns = [
    // Name patterns
    name.toLowerCase().includes('test customer'),
    name.toLowerCase().startsWith('test '),
    name.match(/^Test Customer \d+$/i),

    // Email patterns
    email.includes('test-customer-'),
    email.includes('@example.com'),
    email.includes('test@'),
    email.match(/test-customer-\d+-\d+@example\.com/),

    // Combined patterns
    name.toLowerCase().includes('test') && email.includes('@example.com')
  ];

  return patterns.some(p => p);
}

async function deleteTestCustomers() {
  console.log('🧹 Delete Test Customers Script\n');
  console.log('=' .repeat(70));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No customers will be deleted');
    console.log('   Set DRY_RUN=false to actually delete\n');
  } else {
    console.log('\n🔥 LIVE MODE - Customers will be DELETED');
    console.log('   Press Ctrl+C now to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('=' .repeat(70));

  // 1. Get all customer IDs who own boats
  const { data: boats } = await supabase
    .from('boats')
    .select('customer_id');

  const customerIdsWithBoats = new Set(boats?.map(b => b.customer_id) || []);
  console.log(`\n✅ Found ${customerIdsWithBoats.size} customers with boats (WILL NOT DELETE)`);

  // 2. Get all customers
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('id, name, email, created_at');

  console.log(`📋 Total customers in database: ${allCustomers.length}`);

  // 3. Filter customers without boats
  const customersWithoutBoats = allCustomers.filter(c => !customerIdsWithBoats.has(c.id));
  console.log(`⚠️  Customers without boats: ${customersWithoutBoats.length}`);

  // 4. Identify test customers
  const testCustomers = customersWithoutBoats.filter(isTestCustomer);
  const nonTestCustomersWithoutBoats = customersWithoutBoats.filter(c => !isTestCustomer(c));

  console.log(`\n🧪 Test customers identified: ${testCustomers.length}`);
  console.log(`👤 Real customers without boats: ${nonTestCustomersWithoutBoats.length}`);

  // 5. Show test customers that will be deleted
  if (testCustomers.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('\n🧪 TEST CUSTOMERS TO BE DELETED:\n');

    testCustomers.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name || 'NO NAME'}`);
      console.log(`   Email: ${c.email || 'NO EMAIL'}`);
      console.log(`   ID: ${c.id}`);
      console.log(`   Created: ${c.created_at?.split('T')[0] || 'unknown'}`);
      console.log('');
    });
  }

  // 6. Show real customers without boats (for review)
  if (nonTestCustomersWithoutBoats.length > 0) {
    console.log('=' .repeat(70));
    console.log('\n👤 REAL CUSTOMERS WITHOUT BOATS (WILL NOT DELETE):\n');

    nonTestCustomersWithoutBoats.slice(0, 10).forEach((c, i) => {
      console.log(`${i + 1}. ${c.name || 'NO NAME'}`);
      console.log(`   Email: ${c.email || 'NO EMAIL'}`);
      console.log('');
    });

    if (nonTestCustomersWithoutBoats.length > 10) {
      console.log(`   ... and ${nonTestCustomersWithoutBoats.length - 10} more\n`);
    }
  }

  // 7. Delete test customers
  console.log('=' .repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Total customers: ${allCustomers.length}`);
  console.log(`   Customers with boats: ${customerIdsWithBoats.size} (keep)`);
  console.log(`   Real customers without boats: ${nonTestCustomersWithoutBoats.length} (keep)`);
  console.log(`   Test customers to delete: ${testCustomers.length}`);

  if (testCustomers.length > 0) {
    console.log('\n' + '='.repeat(70));

    if (DRY_RUN) {
      console.log('\n✅ DRY RUN COMPLETE');
      console.log(`\n   Would delete ${testCustomers.length} test customers`);
      console.log(`   Final customer count would be: ${allCustomers.length - testCustomers.length}`);
      console.log('\n   To actually delete, run:');
      console.log('   DRY_RUN=false node scripts/delete-test-customers.mjs\n');
    } else {
      console.log('\n🔥 DELETING TEST CUSTOMERS...\n');

      const testCustomerIds = testCustomers.map(c => c.id);

      // Delete in batches of 100
      let deleted = 0;
      for (let i = 0; i < testCustomerIds.length; i += 100) {
        const batch = testCustomerIds.slice(i, i + 100);
        const { error } = await supabase
          .from('customers')
          .delete()
          .in('id', batch);

        if (error) {
          console.error(`   ✗ Error deleting batch ${i / 100 + 1}:`, error.message);
        } else {
          deleted += batch.length;
          console.log(`   ✓ Deleted batch ${i / 100 + 1}: ${batch.length} customers`);
        }
      }

      console.log(`\n✅ DELETION COMPLETE`);
      console.log(`   Deleted: ${deleted} test customers`);

      // Verify final count
      const { count: finalCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      console.log(`   Final customer count: ${finalCount}`);
      console.log(`   Expected: ${allCustomers.length - testCustomers.length}`);

      if (finalCount === allCustomers.length - testCustomers.length) {
        console.log('\n   ✅ Counts match!\n');
      } else {
        console.log('\n   ⚠️  Count mismatch - please investigate\n');
      }
    }
  } else {
    console.log('\n✅ No test customers found to delete\n');
  }
}

deleteTestCustomers().catch(console.error);
