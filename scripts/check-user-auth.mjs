#!/usr/bin/env node
/**
 * Check User Auth Status
 * Diagnose why Users link isn't showing
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

async function checkAuth() {
  console.log('\n🔍 Checking Auth Status for standardhuman@gmail.com\n');

  try {
    // Get auth user
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const authUser = users.find(u => u.email === 'standardhuman@gmail.com');

    if (!authUser) {
      console.error('❌ Auth user not found');
      return;
    }

    console.log('✅ Auth User Found:');
    console.log('   ID:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Metadata:', JSON.stringify(authUser.user_metadata, null, 2));
    console.log('');

    // Get users table record
    const { data: userRecord } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!userRecord) {
      console.error('❌ Users table record not found');
      return;
    }

    console.log('✅ Users Table Record:');
    console.log('   Role:', userRecord.role);
    console.log('   User Type:', userRecord.user_type);
    console.log('   Active:', userRecord.active);
    console.log('');

    // Check metadata
    const hasStaffMetadata = authUser.user_metadata?.user_type === 'staff';
    const hasOwnerRole = userRecord.role === 'owner' || userRecord.role === 'admin';

    console.log('📋 Diagnosis:');
    console.log('   Has staff metadata:', hasStaffMetadata ? '✅' : '❌');
    console.log('   Has owner/admin role:', hasOwnerRole ? '✅' : '❌');
    console.log('');

    if (!hasStaffMetadata) {
      console.log('⚠️  ISSUE: Auth metadata missing user_type=staff');
      console.log('   The metadata says:', authUser.user_metadata?.user_type || '(not set)');
      console.log('');
      console.log('🔧 Fixing metadata...');

      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        user_metadata: {
          user_type: 'staff',
          role: userRecord.role,
          full_name: userRecord.full_name,
          user_type_detail: userRecord.user_type
        }
      });

      if (error) {
        console.error('❌ Failed to update:', error.message);
      } else {
        console.log('✅ Metadata updated!');
        console.log('');
        console.log('🔄 Next steps:');
        console.log('   1. Log out of https://ops.sailorskills.com');
        console.log('   2. Clear your browser cache/cookies for ops.sailorskills.com');
        console.log('   3. Log back in');
        console.log('   4. The Users link should now appear');
      }
    } else {
      console.log('✅ Everything looks correct!');
      console.log('');
      console.log('🔄 If Users link still not showing:');
      console.log('   1. Log out of https://ops.sailorskills.com');
      console.log('   2. Clear browser cache/cookies');
      console.log('   3. Log back in');
      console.log('   4. Hard refresh the page (Cmd+Shift+R)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAuth();
