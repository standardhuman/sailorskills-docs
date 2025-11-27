#!/usr/bin/env node

/**
 * Fix Boat Ownership Data Integrity Issues
 *
 * Phase 1 Fixes:
 * 1. David Marcolini's boats - reassign Nimbus and Take it Easy
 * 2. Steven Miyamoto's duplicate Nighthawk - delete the one with 0 logs
 * 3. Paul Fetherston's boats - delete Sartori and Gigi
 *
 * Usage:
 *   node scripts/fix-boat-ownership-issues.mjs          # Dry run
 *   DRY_RUN=false node scripts/fix-boat-ownership-issues.mjs  # Execute fixes
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
 * Find or create a customer
 */
async function findOrCreateCustomer(name, email = null) {
  // Try to find existing customer
  const { data: existing } = await supabase
    .from('customers')
    .select('id, name, email')
    .ilike('name', name)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new customer if not found
  if (!DRY_RUN) {
    // Generate placeholder email if none provided (email is required in schema)
    const customerEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`;

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert({
        name: name,
        email: customerEmail,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create customer ${name}: ${error.message}`);
    }

    return newCustomer;
  } else {
    return { id: 'DRY_RUN_NEW_CUSTOMER', name, email };
  }
}

/**
 * Update boat's customer_id
 */
async function reassignBoat(boatName, fromCustomerName, toCustomerName, toCustomerEmail = null) {
  console.log(`\n🔄 Reassigning ${boatName}:`);
  console.log(`   From: ${fromCustomerName}`);
  console.log(`   To: ${toCustomerName}`);

  // Get the boat
  const { data: boat } = await supabase
    .from('boats')
    .select('id, name, customer_id')
    .eq('name', boatName)
    .single();

  if (!boat) {
    console.log(`   ✗ Boat "${boatName}" not found`);
    return false;
  }

  // Get or create target customer
  const targetCustomer = await findOrCreateCustomer(toCustomerName, toCustomerEmail);

  if (!DRY_RUN) {
    // Update boat's customer_id
    const { error } = await supabase
      .from('boats')
      .update({ customer_id: targetCustomer.id })
      .eq('id', boat.id);

    if (error) {
      console.log(`   ✗ Failed to update: ${error.message}`);
      return false;
    }
  }

  console.log(`   ✓ Updated customer_id to: ${targetCustomer.id}`);
  if (targetCustomer.id === 'DRY_RUN_NEW_CUSTOMER') {
    console.log(`   📝 Will create new customer: ${toCustomerName} (${toCustomerEmail || 'no email'})`);
  }
  return true;
}

/**
 * Delete a boat
 */
async function deleteBoat(boatName, ownerName, reason) {
  console.log(`\n🗑️  Deleting ${boatName} (${ownerName}):`);
  console.log(`   Reason: ${reason}`);

  // Get the boat
  const { data: boat } = await supabase
    .from('boats')
    .select('id, name, customer_id')
    .eq('name', boatName)
    .single();

  if (!boat) {
    console.log(`   ✗ Boat "${boatName}" not found`);
    return false;
  }

  // Check for service logs
  const { count: logCount } = await supabase
    .from('service_logs')
    .select('*', { count: 'exact', head: true })
    .eq('boat_id', boat.id);

  console.log(`   Service logs: ${logCount}`);

  if (!DRY_RUN) {
    // Delete service logs first (if any)
    if (logCount > 0) {
      const { error: logsError } = await supabase
        .from('service_logs')
        .delete()
        .eq('boat_id', boat.id);

      if (logsError) {
        console.log(`   ✗ Failed to delete service logs: ${logsError.message}`);
        return false;
      }
      console.log(`   ✓ Deleted ${logCount} service logs`);
    }

    // Delete the boat
    const { error } = await supabase
      .from('boats')
      .delete()
      .eq('id', boat.id);

    if (error) {
      console.log(`   ✗ Failed to delete boat: ${error.message}`);
      return false;
    }
  }

  console.log(`   ✓ Boat deleted`);
  return true;
}

async function fixOwnershipIssues() {
  console.log('🔧 Boat Ownership Data Integrity Fixes\n');
  console.log('=' .repeat(70));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made');
    console.log('   Set DRY_RUN=false to execute fixes\n');
  } else {
    console.log('\n🔥 LIVE MODE - Changes will be applied');
    console.log('   Press Ctrl+C now to cancel\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  console.log('=' .repeat(70));

  let successCount = 0;
  let errorCount = 0;

  // =================================================================
  // FIX 1: David Marcolini's boats
  // =================================================================
  console.log('\n📋 FIX 1: David Marcolini\'s Boats\n');
  console.log('Issue: Nimbus and Take it Easy incorrectly assigned to David');
  console.log('Expected:');
  console.log('  - One Prolonged Blast → David Marcolini ✓ (keep as-is)');
  console.log('  - Nimbus → Ilya Khanykov (fix)');
  console.log('  - Take it Easy → Jose Larrain (fix)');

  // Fix Nimbus
  if (await reassignBoat('Nimbus', 'David Marcolini', 'Ilya Khanykov', 'khanykov@gmail.com')) {
    successCount++;
  } else {
    errorCount++;
  }

  // Fix Take it Easy
  if (await reassignBoat('Take it Easy', 'David Marcolini', 'Jose Larrain', null)) {
    successCount++;
  } else {
    errorCount++;
  }

  // =================================================================
  // FIX 2: Steven Miyamoto's duplicate Nighthawk
  // =================================================================
  console.log('\n' + '=' .repeat(70));
  console.log('\n📋 FIX 2: Steven Miyamoto\'s Duplicate Nighthawk\n');
  console.log('Issue: Two boats named "Nighthawk" owned by Steven Miyamoto');
  console.log('Action: Delete the one with 0 service logs');

  // Find both Nighthawks
  const { data: nighthawks } = await supabase
    .from('boats')
    .select('id, name, customer_id, customers!inner(name)')
    .eq('name', 'Nighthawk')
    .ilike('customers.name', '%miyamoto%');

  if (nighthawks && nighthawks.length === 2) {
    console.log(`\nFound ${nighthawks.length} Nighthawk boats:`);

    for (const boat of nighthawks) {
      const { count } = await supabase
        .from('service_logs')
        .select('*', { count: 'exact', head: true })
        .eq('boat_id', boat.id);

      console.log(`  - Nighthawk (ID: ${boat.id.substring(0, 8)}...): ${count} service logs`);

      // Delete the one with 0 logs
      if (count === 0) {
        console.log(`\n🗑️  Deleting Nighthawk duplicate (ID: ${boat.id.substring(0, 8)}...):`);
        console.log(`   Reason: Duplicate with no service logs`);

        if (!DRY_RUN) {
          const { error } = await supabase
            .from('boats')
            .delete()
            .eq('id', boat.id);

          if (error) {
            console.log(`   ✗ Failed to delete: ${error.message}`);
            errorCount++;
          } else {
            console.log(`   ✓ Boat deleted`);
            successCount++;
          }
        } else {
          console.log(`   ✓ Will be deleted`);
          successCount++;
        }
      }
    }
  } else {
    console.log(`\n⚠️  Expected 2 Nighthawks, found ${nighthawks?.length || 0}`);
    errorCount++;
  }

  // =================================================================
  // FIX 3: Paul Fetherston's boats
  // =================================================================
  console.log('\n' + '=' .repeat(70));
  console.log('\n📋 FIX 3: Paul Fetherston\'s Boats\n');
  console.log('Issue: Sartori and Gigi should be removed');
  console.log('Action: Delete both boats (keep Paul Fetherston customer record)');

  // Delete Sartori
  if (await deleteBoat('Sartori', 'Paul Fetherston', 'No longer owned')) {
    successCount++;
  } else {
    errorCount++;
  }

  // Delete Gigi
  if (await deleteBoat('Gigi', 'Paul Fetherston', 'No longer owned')) {
    successCount++;
  } else {
    errorCount++;
  }

  // =================================================================
  // VERIFICATION
  // =================================================================
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 VERIFICATION\n');

  // Check David Marcolini's boats
  const { data: marcoliniBoats } = await supabase
    .from('boats')
    .select('name, customers!inner(name)')
    .ilike('customers.name', '%marcolini%');

  console.log('David Marcolini\'s boats:');
  if (marcoliniBoats && marcoliniBoats.length > 0) {
    marcoliniBoats.forEach(b => console.log(`  - ${b.name}`));
  } else {
    console.log('  None found');
  }

  // Check Ilya Khanykov's boats
  const { data: khanykovBoats } = await supabase
    .from('boats')
    .select('name, customers!inner(name)')
    .ilike('customers.name', '%khanykov%');

  console.log('\nIlya Khanykov\'s boats:');
  if (khanykovBoats && khanykovBoats.length > 0) {
    khanykovBoats.forEach(b => console.log(`  - ${b.name}`));
  } else {
    console.log('  None found');
  }

  // Check Jose Larrain
  const { data: larrainBoats } = await supabase
    .from('boats')
    .select('name, customers!inner(name)')
    .ilike('customers.name', '%larrain%');

  console.log('\nJose Larrain\'s boats:');
  if (larrainBoats && larrainBoats.length > 0) {
    larrainBoats.forEach(b => console.log(`  - ${b.name}`));
  } else {
    console.log('  None found (customer will be created)');
  }

  // Check Steven Miyamoto's boats
  const { data: miyamotoBoats } = await supabase
    .from('boats')
    .select('name, customers!inner(name)')
    .ilike('customers.name', '%miyamoto%');

  console.log('\nSteven Miyamoto\'s boats:');
  if (miyamotoBoats && miyamotoBoats.length > 0) {
    miyamotoBoats.forEach(b => console.log(`  - ${b.name}`));
  } else {
    console.log('  None found');
  }

  // Check Paul Fetherston's boats
  const { data: fetherstonBoats } = await supabase
    .from('boats')
    .select('name, customers!inner(name)')
    .ilike('customers.name', '%fetherston%');

  console.log('\nPaul Fetherston\'s boats:');
  if (fetherstonBoats && fetherstonBoats.length > 0) {
    fetherstonBoats.forEach(b => console.log(`  - ${b.name}`));
  } else {
    console.log('  None found (correct - boats deleted)');
  }

  // =================================================================
  // SUMMARY
  // =================================================================
  console.log('\n' + '=' .repeat(70));
  console.log('\n📊 SUMMARY:\n');
  console.log(`   Successful operations: ${successCount}`);
  console.log(`   Failed operations: ${errorCount}`);

  if (DRY_RUN) {
    console.log('\n✅ DRY RUN COMPLETE');
    console.log('\n   To execute these fixes, run:');
    console.log('   DRY_RUN=false node scripts/fix-boat-ownership-issues.mjs\n');
  } else {
    console.log('\n✅ FIXES APPLIED');
    console.log('\n   Expected final state:');
    console.log('   - David Marcolini: 1 boat (One Prolonged Blast)');
    console.log('   - Ilya Khanykov: 1 boat (Nimbus)');
    console.log('   - Jose Larrain: 1 boat (Take it Easy)');
    console.log('   - Steven Miyamoto: 1 boat (Nighthawk)');
    console.log('   - Paul Fetherston: 0 boats\n');
  }
}

fixOwnershipIssues().catch(console.error);
