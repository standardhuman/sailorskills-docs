#!/usr/bin/env node

/**
 * Audit all customers showing multiple boats
 * Check if they legitimately own multiple boats or if there are data errors
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

async function auditMultipleBoatOwners() {
  console.log('🔍 Auditing Customers with Multiple Boats\n');
  console.log('=' .repeat(70));

  // 1. Get all boats with customer info
  const { data: boats } = await supabase
    .from('boats')
    .select('id, name, customer_id, customers!inner(name, email)');

  // 2. Group boats by customer
  const customerBoats = {};
  boats.forEach(boat => {
    const customerId = boat.customer_id;
    if (!customerBoats[customerId]) {
      customerBoats[customerId] = {
        customerName: boat.customers.name,
        customerEmail: boat.customers.email,
        boats: []
      };
    }
    customerBoats[customerId].boats.push(boat.name);
  });

  // 3. Filter customers with multiple boats
  const multipleBoatOwners = Object.entries(customerBoats)
    .filter(([_, data]) => data.boats.length > 1)
    .sort((a, b) => b[1].boats.length - a[1].boats.length);

  console.log(`\n📊 Found ${multipleBoatOwners.length} customers with multiple boats\n`);
  console.log('=' .repeat(70));

  // 4. Detailed audit of each customer
  for (const [customerId, data] of multipleBoatOwners) {
    console.log(`\n👤 ${data.customerName}`);
    console.log(`   Email: ${data.customerEmail || 'NO EMAIL'}`);
    console.log(`   Customer ID: ${customerId}`);
    console.log(`   Boats: ${data.boats.length}`);

    data.boats.forEach((boatName, i) => {
      console.log(`   ${i + 1}. ${boatName}`);
    });

    // Check service logs to see if these boats have real service history
    const { data: boatsData } = await supabase
      .from('boats')
      .select('id, name')
      .eq('customer_id', customerId);

    console.log(`\n   Service History:`);

    for (const boat of boatsData || []) {
      const { data: logs, count } = await supabase
        .from('service_logs')
        .select('service_date', { count: 'exact' })
        .eq('boat_id', boat.id)
        .order('service_date', { ascending: false })
        .limit(1);

      if (count > 0) {
        console.log(`   ✓ ${boat.name}: ${count} service logs (latest: ${logs[0].service_date})`);
      } else {
        console.log(`   ⚠ ${boat.name}: NO service logs`);
      }
    }

    console.log('\n   ' + '-'.repeat(66));
  }

  // 5. Summary statistics
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 SUMMARY:\n');

  const totalBoatsInMultiple = multipleBoatOwners.reduce((sum, [_, data]) => sum + data.boats.length, 0);
  const ownersWithThree = multipleBoatOwners.filter(([_, data]) => data.boats.length >= 3).length;
  const ownersWithTwo = multipleBoatOwners.filter(([_, data]) => data.boats.length === 2).length;
  const ownersWithNoEmail = multipleBoatOwners.filter(([_, data]) => !data.customerEmail).length;

  console.log(`   Total customers with multiple boats: ${multipleBoatOwners.length}`);
  console.log(`   - With 3+ boats: ${ownersWithThree}`);
  console.log(`   - With 2 boats: ${ownersWithTwo}`);
  console.log(`   Total boats in these accounts: ${totalBoatsInMultiple}`);
  console.log(`   Customers without email: ${ownersWithNoEmail}`);

  // 6. Suspicious cases
  console.log('\n⚠️  SUSPICIOUS CASES (no email = potential data error):\n');

  const suspiciousCases = multipleBoatOwners.filter(([_, data]) => !data.customerEmail);

  if (suspiciousCases.length > 0) {
    suspiciousCases.forEach(([customerId, data]) => {
      console.log(`   ${data.customerName}: ${data.boats.length} boats, NO EMAIL`);
      data.boats.forEach(boat => console.log(`     - ${boat}`));
    });
  } else {
    console.log('   None found - all multiple-boat owners have email addresses');
  }

  // 7. Action items
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 NEXT STEPS:\n');
  console.log('   1. Review customers WITHOUT email - likely data errors');
  console.log('   2. Verify boats with NO service logs - may be incorrectly linked');
  console.log('   3. Cross-check with known correct data (like David Marcolini case)');
  console.log('\n   Known Issue: David Marcolini (no email) has 3 boats');
  console.log('   - One Prolonged Blast ✓ (correct)');
  console.log('   - Nimbus ✗ (should be Ilya Khanykov)');
  console.log('   - Take it Easy ✗ (should be Jose Larrain)');
  console.log('\n');
}

auditMultipleBoatOwners().catch(console.error);
