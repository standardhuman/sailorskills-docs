#!/usr/bin/env node

/**
 * Investigate boat ownership data integrity issue
 *
 * David Marcolini showing 3 boats but should only own "One Prolonged Blast"
 * - Nimbus should be Ilya Khanykov
 * - Take It Easy should be Jose Larrain
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

async function investigateOwnership() {
  console.log('🔍 Investigating Boat Ownership Data Integrity\n');
  console.log('=' .repeat(70));

  // 1. Check David Marcolini's boats
  console.log('\n📊 DAVID MARCOLINI\'S BOATS:\n');

  const { data: marcoliniCustomer } = await supabase
    .from('customers')
    .select('id, name, email')
    .ilike('name', '%marcolini%')
    .single();

  if (marcoliniCustomer) {
    console.log(`Customer: ${marcoliniCustomer.name}`);
    console.log(`Email: ${marcoliniCustomer.email}`);
    console.log(`ID: ${marcoliniCustomer.id}\n`);

    const { data: marcoliniBoats } = await supabase
      .from('boats')
      .select('id, name, customer_id, customer_name, customer_email')
      .eq('customer_id', marcoliniCustomer.id);

    console.log(`Boats linked via customer_id: ${marcoliniBoats?.length || 0}`);
    marcoliniBoats?.forEach(boat => {
      console.log(`  - ${boat.name}`);
      console.log(`    customer_name field: ${boat.customer_name || 'NULL'}`);
      console.log(`    customer_email field: ${boat.customer_email || 'NULL'}`);
    });
  }

  // 2. Check the three specific boats
  console.log('\n' + '='.repeat(70));
  console.log('\n🚤 CHECKING SPECIFIC BOATS:\n');

  const boatNames = ['One Prolonged Blast', 'Nimbus', 'Take It Easy'];

  for (const boatName of boatNames) {
    const { data: boat } = await supabase
      .from('boats')
      .select('id, name, customer_id, customer_name, customer_email')
      .eq('name', boatName)
      .maybeSingle();

    if (boat) {
      console.log(`\n${boatName}:`);
      console.log(`  Boat ID: ${boat.id}`);
      console.log(`  customer_id: ${boat.customer_id}`);
      console.log(`  customer_name (denormalized): ${boat.customer_name || 'NULL'}`);
      console.log(`  customer_email (denormalized): ${boat.customer_email || 'NULL'}`);

      // Get actual customer from customers table
      if (boat.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('id', boat.customer_id)
          .single();

        console.log(`  Actual customer (via FK):`);
        console.log(`    Name: ${customer?.name || 'NOT FOUND'}`);
        console.log(`    Email: ${customer?.email || 'NULL'}`);
      }
    } else {
      console.log(`\n${boatName}: NOT FOUND`);
    }
  }

  // 3. Check for Ilya Khanykov and Jose Larrain
  console.log('\n' + '='.repeat(70));
  console.log('\n👥 CHECKING CORRECT OWNERS:\n');

  const correctOwners = [
    { name: 'Ilya Khanykov', boat: 'Nimbus' },
    { name: 'Jose Larrain', boat: 'Take It Easy' }
  ];

  for (const owner of correctOwners) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, email')
      .ilike('name', `%${owner.name}%`)
      .maybeSingle();

    console.log(`\n${owner.name} (should own ${owner.boat}):`);
    if (customer) {
      console.log(`  Found in customers table:`);
      console.log(`    ID: ${customer.id}`);
      console.log(`    Name: ${customer.name}`);
      console.log(`    Email: ${customer.email || 'NULL (no email)'}`);

      // Check if they have any boats linked
      const { data: boats } = await supabase
        .from('boats')
        .select('name')
        .eq('customer_id', customer.id);

      console.log(`  Boats linked to this customer: ${boats?.length || 0}`);
      boats?.forEach(b => console.log(`    - ${b.name}`));
    } else {
      console.log(`  NOT FOUND in customers table`);
    }
  }

  // 4. Check boats table for legacy customer_name/email fields
  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 CHECKING LEGACY CUSTOMER FIELDS IN BOATS TABLE:\n');

  const { data: allBoats } = await supabase
    .from('boats')
    .select('id, name, customer_id, customer_name, customer_email')
    .in('name', boatNames);

  console.log('Comparing customer_id (FK) vs customer_name (denormalized):\n');

  for (const boat of allBoats || []) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name, email')
      .eq('id', boat.customer_id)
      .single();

    console.log(`${boat.name}:`);
    console.log(`  Via customer_id FK: ${customer?.name || 'NOT FOUND'}`);
    console.log(`  Via customer_name field: ${boat.customer_name || 'NULL'}`);
    console.log(`  MATCH: ${customer?.name === boat.customer_name ? '✅' : '❌'}`);
    console.log('');
  }

  // 5. Check service logs for ownership clues
  console.log('=' .repeat(70));
  console.log('\n📝 CHECKING SERVICE LOGS FOR OWNERSHIP HISTORY:\n');

  for (const boatName of boatNames) {
    const { data: boat } = await supabase
      .from('boats')
      .select('id')
      .eq('name', boatName)
      .single();

    if (boat) {
      const { data: logs } = await supabase
        .from('service_logs')
        .select('service_date, created_at')
        .eq('boat_id', boat.id)
        .order('service_date', { ascending: false })
        .limit(1);

      console.log(`${boatName}:`);
      if (logs && logs.length > 0) {
        console.log(`  Latest service: ${logs[0].service_date}`);
        console.log(`  Created: ${logs[0].created_at?.split('T')[0]}`);
      } else {
        console.log(`  No service logs found`);
      }
    }
  }

  // 6. Pattern analysis - look for other boats with wrong customer_id
  console.log('\n' + '='.repeat(70));
  console.log('\n🔍 PATTERN ANALYSIS - Looking for similar issues:\n');

  const { data: allBoatsCheck } = await supabase
    .from('boats')
    .select('id, name, customer_id, customer_name');

  let mismatches = 0;
  const mismatchedBoats = [];

  for (const boat of allBoatsCheck || []) {
    if (boat.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('name')
        .eq('id', boat.customer_id)
        .single();

      if (customer && boat.customer_name && customer.name !== boat.customer_name) {
        mismatches++;
        mismatchedBoats.push({
          boat: boat.name,
          viaFK: customer.name,
          viaDenorm: boat.customer_name
        });
      }
    }
  }

  console.log(`Boats with customer_id vs customer_name mismatch: ${mismatches}`);
  if (mismatchedBoats.length > 0) {
    console.log('\nFirst 10 mismatches:');
    mismatchedBoats.slice(0, 10).forEach(m => {
      console.log(`  ${m.boat}:`);
      console.log(`    FK says: ${m.viaFK}`);
      console.log(`    Denormalized says: ${m.viaDenorm}`);
    });
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n💡 HYPOTHESIS:');
  console.log('The customer_id foreign key is WRONG for these boats.');
  console.log('Need to investigate how customer_id was set during import.');
  console.log('\n');
}

investigateOwnership().catch(console.error);
