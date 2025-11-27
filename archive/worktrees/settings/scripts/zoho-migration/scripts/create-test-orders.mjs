#!/usr/bin/env node
/**
 * Create Test Orders - Usage: node scripts/create-test-orders.mjs
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const sampleOrders = [
  { order_number: 'TEST-ORD-001', service_type: 'Cleaning & Anodes', service_interval: '1-month', estimated_amount: 450, created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'normal' } },
  { order_number: 'TEST-ORD-002', service_type: 'Inspection', service_interval: '3-month', estimated_amount: 275, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'normal' } },
  { order_number: 'TEST-ORD-003', service_type: 'Paint & Bottom', service_interval: '6-month', estimated_amount: 1250, created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'high' } },
  { order_number: 'TEST-ORD-004', service_type: 'Cleaning & Anodes', service_interval: '2-month', estimated_amount: 520, created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'normal' } },
  { order_number: 'TEST-ORD-005', service_type: 'Inspection', service_interval: '1-month', estimated_amount: 185, created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'normal' } },
  { order_number: 'TEST-ORD-006', service_type: 'Propeller Service', service_interval: '3-month', estimated_amount: 350, created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), notes: 'Test order', service_details: { priority: 'normal' } }
];

async function main() {
  console.log('🚀 Creating test orders...\n');
  const { data: customer } = await supabase.from('customers').select('*').limit(1).single();
  if (!customer) { console.error('❌ No customers found!'); process.exit(1); }
  
  const { data: boats } = await supabase.from('boats').select('*').eq('customer_id', customer.id);
  if (!boats || boats.length === 0) { console.error('❌ No boats found!'); process.exit(1); }
  
  const ordersToCreate = sampleOrders.map((order, i) => ({
    ...order,
    customer_id: customer.id,
    boat_id: boats[i % boats.length].id,
    marina_id: boats[i % boats.length].marina_id,
    status: 'pending',
    metadata: { test_data: true }
  }));
  
  const { data, error } = await supabase.from('service_orders').insert(ordersToCreate).select();
  if (error) { console.error('❌ Error:', error.message); process.exit(1); }
  
  console.log(`✅ Created ${data.length} test orders!\n`);
}

main().catch(console.error);
