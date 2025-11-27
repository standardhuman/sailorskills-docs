#!/usr/bin/env node

/**
 * Investigate customer count discrepancy
 * 174 boats but 226 customers doesn't make sense if customers own multiple boats
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

async function investigateCustomers() {
  console.log('🔍 Investigating Customer Count Discrepancy\n');
  console.log('=' .repeat(70));

  // 1. Get all boats with customer info
  const { data: boats, error: boatsError } = await supabase
    .from('boats')
    .select('id, name, customer_id, customers!inner(name, email)');

  if (boatsError) {
    console.error('Error fetching boats:', boatsError);
    return;
  }

  console.log(`\n📊 BOATS: ${boats.length} total`);

  // 2. Extract unique customer names from boats
  const customerNamesFromBoats = new Set();
  const customerIdsFromBoats = new Set();

  boats.forEach(boat => {
    if (boat.customers?.name) {
      customerNamesFromBoats.add(boat.customers.name);
      customerIdsFromBoats.add(boat.customer_id);
    }
  });

  console.log(`\n👥 UNIQUE CUSTOMERS WHO OWN BOATS:`);
  console.log(`   By ID: ${customerIdsFromBoats.size}`);
  console.log(`   By Name: ${customerNamesFromBoats.size}`);

  // 3. Get total customers in database
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📋 TOTAL CUSTOMERS IN DATABASE: ${totalCustomers}`);

  // 4. Find customers WITHOUT boats
  const { data: customersWithoutBoats, error: noBoatsError } = await supabase
    .from('customers')
    .select('id, name, email')
    .not('id', 'in', `(${Array.from(customerIdsFromBoats).join(',')})`);

  if (noBoatsError) {
    console.error('Error:', noBoatsError);
  } else {
    console.log(`\n⚠️  CUSTOMERS WITHOUT BOATS: ${customersWithoutBoats.length}`);

    if (customersWithoutBoats.length > 0) {
      console.log('\n   First 20 customers without boats:');
      customersWithoutBoats.slice(0, 20).forEach(c => {
        console.log(`   - ${c.name || 'NO NAME'} (${c.email || 'NO EMAIL'})`);
      });

      if (customersWithoutBoats.length > 20) {
        console.log(`   ... and ${customersWithoutBoats.length - 20} more`);
      }
    }
  }

  // 5. Check for duplicate customer names in boats
  const customerNameCounts = {};
  boats.forEach(boat => {
    const name = boat.customers?.name;
    if (name) {
      customerNameCounts[name] = (customerNameCounts[name] || 0) + 1;
    }
  });

  const customersWithMultipleBoats = Object.entries(customerNameCounts)
    .filter(([_, count]) => count > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`\n🚤 CUSTOMERS WITH MULTIPLE BOATS: ${customersWithMultipleBoats.length}`);
  if (customersWithMultipleBoats.length > 0) {
    console.log('\n   Top 10:');
    customersWithMultipleBoats.slice(0, 10).forEach(([name, count]) => {
      console.log(`   - ${name}: ${count} boats`);
    });
  }

  // 6. Summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:');
  console.log(`   Total boats: ${boats.length}`);
  console.log(`   Unique customers with boats: ${customerIdsFromBoats.size}`);
  console.log(`   Customers with multiple boats: ${customersWithMultipleBoats.length}`);
  console.log(`   Total customers in database: ${totalCustomers}`);
  console.log(`   Customers WITHOUT boats: ${customersWithoutBoats.length}`);

  console.log('\n❓ EXPECTED vs ACTUAL:');
  console.log(`   Expected: ${customerIdsFromBoats.size} customers (those with boats)`);
  console.log(`   Actual: ${totalCustomers} customers in database`);
  console.log(`   Difference: ${totalCustomers - customerIdsFromBoats.size} extra customers`);

  console.log('\n💡 CONCLUSION:');
  if (totalCustomers > customerIdsFromBoats.size) {
    console.log(`   The database has ${totalCustomers - customerIdsFromBoats.size} customers without boats.`);
    console.log(`   These may be:`);
    console.log(`   - Test data that wasn't cleaned up`);
    console.log(`   - Customers who canceled before getting boats`);
    console.log(`   - Duplicate/orphaned records`);
    console.log(`   - Customers awaiting onboarding`);
  }

  console.log('\n');
}

investigateCustomers().catch(console.error);
