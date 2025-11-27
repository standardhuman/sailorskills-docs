#!/usr/bin/env node
/**
 * Cleanup Test Orders - Usage: node scripts/cleanup-test-orders.mjs
 */
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log('🧹 Cleaning up test orders...\n');
  
  const { data, error: queryError } = await supabase
    .from('service_orders')
    .select('*')
    .or('order_number.like.TEST-%,metadata->>test_data.eq.true');
  
  if (queryError) { console.error('❌ Error:', queryError.message); process.exit(1); }
  if (!data || data.length === 0) { console.log('✅ No test orders found!'); process.exit(0); }
  
  console.log(`📋 Found ${data.length} test orders to delete\n`);
  
  const { error } = await supabase
    .from('service_orders')
    .delete()
    .or('order_number.like.TEST-%,metadata->>test_data.eq.true');
  
  if (error) { console.error('❌ Error:', error.message); process.exit(1); }
  
  console.log(`✅ Successfully deleted ${data.length} test orders!`);
}

main().catch(console.error);
