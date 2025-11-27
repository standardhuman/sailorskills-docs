#!/usr/bin/env node

/**
 * Database Diagnostic Script
 * Checks the current state of the database to identify issues
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

async function diagnose() {
  console.log('🔍 Database Diagnostic Report\n');
  console.log('=' .repeat(60));

  // 1. Check table counts
  console.log('\n📊 TABLE COUNTS:');
  const tables = ['customers', 'boats', 'service_logs', 'service_orders', 'invoices', 'paint_repaint_schedule', 'service_schedules'];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table.padEnd(25)}: ${count ?? 'ERROR'}`);
    if (error) console.log(`    Error: ${error.message}`);
  }

  // 2. Check boats with/without customer_name
  console.log('\n👤 CUSTOMER NAMES IN BOATS:');
  const { data: boatsWithoutCustomerName } = await supabase
    .from('boats')
    .select('id, name, customer_id, customer_name')
    .is('customer_name', null)
    .limit(5);

  console.log(`  Boats WITHOUT customer_name: ${boatsWithoutCustomerName?.length || 0}`);
  if (boatsWithoutCustomerName && boatsWithoutCustomerName.length > 0) {
    console.log('  Sample (first 5):');
    boatsWithoutCustomerName.forEach(b => {
      console.log(`    - ${b.name} (customer_id: ${b.customer_id})`);
    });
  }

  // 3. Check boats with customer_name
  const { count: boatsWithCustomerName } = await supabase
    .from('boats')
    .select('*', { count: 'exact', head: true })
    .not('customer_name', 'is', null);

  console.log(`  Boats WITH customer_name: ${boatsWithCustomerName}`);

  // 4. Check paint_repaint_schedule coverage
  console.log('\n🎨 PAINT SCHEDULE COVERAGE:');
  const { count: totalBoats } = await supabase
    .from('boats')
    .select('*', { count: 'exact', head: true });

  const { count: boatsWithPaintSchedule } = await supabase
    .from('paint_repaint_schedule')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total boats: ${totalBoats}`);
  console.log(`  Boats with paint_repaint_schedule: ${boatsWithPaintSchedule}`);
  console.log(`  Boats WITHOUT paint schedule: ${totalBoats - boatsWithPaintSchedule}`);

  // 5. Check service_schedules coverage
  console.log('\n📅 SERVICE SCHEDULE COVERAGE:');
  const { count: boatsWithServiceSchedule } = await supabase
    .from('service_schedules')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  console.log(`  Boats with active service_schedules: ${boatsWithServiceSchedule}`);
  console.log(`  Boats WITHOUT service schedule: ${totalBoats - boatsWithServiceSchedule}`);

  // 6. Check service_orders
  console.log('\n📋 SERVICE ORDERS:');
  const { data: orders } = await supabase
    .from('service_orders')
    .select('id, boat_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log(`  Total service_orders: ${orders?.length || 0}`);
  if (orders && orders.length > 0) {
    console.log('  Recent orders:');
    orders.forEach(o => console.log(`    - ${o.id} (status: ${o.status})`));
  } else {
    console.log('  ⚠️  NO SERVICE ORDERS IN DATABASE');
  }

  // 7. Sample boats with full data
  console.log('\n🚤 SAMPLE BOAT DATA (first 3):');
  const { data: sampleBoats } = await supabase
    .from('boats')
    .select('id, name, customer_id, customer_name')
    .limit(3);

  if (sampleBoats) {
    for (const boat of sampleBoats) {
      console.log(`\n  Boat: ${boat.name}`);
      console.log(`    - customer_id: ${boat.customer_id}`);
      console.log(`    - customer_name: ${boat.customer_name || 'NULL'}`);

      // Get customer from customers table
      if (boat.customer_id) {
        const { data: customer } = await supabase
          .from('customers')
          .select('name, email')
          .eq('id', boat.customer_id)
          .single();
        console.log(`    - customer (from table): ${customer?.name || 'NOT FOUND'}`);
      }

      // Get latest service
      const { data: latestService } = await supabase
        .from('service_logs')
        .select('service_date, paint_condition_overall')
        .eq('boat_id', boat.id)
        .order('service_date', { ascending: false })
        .limit(1)
        .single();
      console.log(`    - latest service: ${latestService?.service_date || 'NONE'}`);
      console.log(`    - paint condition: ${latestService?.paint_condition_overall || 'NONE'}`);

      // Get paint schedule
      const { data: paintSchedule } = await supabase
        .from('paint_repaint_schedule')
        .select('urgency_level')
        .eq('boat_id', boat.id)
        .maybeSingle();
      console.log(`    - paint_repaint_schedule: ${paintSchedule ? paintSchedule.urgency_level : 'MISSING'}`);

      // Get service schedule
      const { data: serviceSchedule } = await supabase
        .from('service_schedules')
        .select('scheduled_date, pattern_date')
        .eq('boat_id', boat.id)
        .eq('is_active', true)
        .maybeSingle();
      console.log(`    - service_schedules: ${serviceSchedule ? (serviceSchedule.scheduled_date || serviceSchedule.pattern_date) : 'MISSING'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete\n');
}

diagnose().catch(console.error);
