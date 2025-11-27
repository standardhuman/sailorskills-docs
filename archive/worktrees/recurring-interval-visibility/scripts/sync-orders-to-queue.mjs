#!/usr/bin/env node
/**
 * Sync Service Orders to Scheduling Queue
 *
 * Creates scheduling_queue entries for pending service_orders that don't have them
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function syncToQueue() {
  console.log('\n🔄 Syncing Pending Service Orders to Scheduling Queue\n');

  try {
    // Find pending service_orders without scheduling_queue entries
    console.log('1️⃣  Finding orphaned service orders...');
    const { data: orphanedOrders, error: findError } = await supabase
      .from('service_orders')
      .select(`
        id,
        customer_id,
        boat_id,
        service_type,
        notes,
        created_at
      `)
      .eq('status', 'pending')
      .is('scheduled_date', null);

    if (findError) {
      console.error('❌ Error finding orders:', findError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${orphanedOrders.length} pending service orders`);

    if (orphanedOrders.length === 0) {
      console.log('\n✨ No orders to sync. Queue is up to date!');
      return;
    }

    // Check which ones already have queue entries
    console.log('\n2️⃣  Checking existing queue entries...');
    const { data: existingQueue } = await supabase
      .from('scheduling_queue')
      .select('scheduled_service_order_id')
      .in('scheduled_service_order_id', orphanedOrders.map(o => o.id));

    const existingIds = new Set(existingQueue?.map(q => q.scheduled_service_order_id) || []);

    // Filter to only orders that don't have queue entries
    const ordersToSync = orphanedOrders.filter(o => !existingIds.has(o.id));

    console.log(`✅ ${ordersToSync.length} orders need queue entries`);

    if (ordersToSync.length === 0) {
      console.log('\n✨ All orders already in queue!');
      return;
    }

    // Create queue entries
    console.log('\n3️⃣  Creating queue entries...');
    const queueEntries = ordersToSync.map(order => ({
      customer_id: order.customer_id,
      boat_id: order.boat_id,
      service_type: order.service_type || 'Hull Cleaning',
      priority: 'normal',
      notes: order.notes,
      status: 'pending',
      added_at: order.created_at,
      scheduled_service_order_id: null // Will link when scheduled
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('scheduling_queue')
      .insert(queueEntries)
      .select();

    if (insertError) {
      console.error('❌ Error creating queue entries:', insertError.message);
      process.exit(1);
    }

    console.log(`✅ Created ${inserted.length} queue entries`);

    // Show summary
    console.log('\n📋 Summary:');
    inserted.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.service_type} - ${entry.priority} priority`);
    });

    console.log('\n🎉 Success! Queue synced.');
    console.log('\nNext steps:');
    console.log('1. Go to https://ops.sailorskills.com');
    console.log('2. Click Work → Queue');
    console.log(`3. You should now see ${inserted.length} items in the queue`);
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

syncToQueue();
