#!/usr/bin/env node
/**
 * Link Existing Auth User to Users Table
 *
 * This script creates a users table record for an existing Supabase auth user.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function linkAuthUser() {
  console.log('\n🔗 Linking Existing Auth User to Users Table\n');

  const email = 'standardhuman@gmail.com';

  try {
    // Step 1: Find the auth user
    console.log('1️⃣  Finding auth user...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      process.exit(1);
    }

    const authUser = users.find(u => u.email === email);

    if (!authUser) {
      console.error('❌ Auth user not found for email:', email);
      process.exit(1);
    }

    console.log('✅ Found auth user:', authUser.id);
    console.log('   Email:', authUser.email);
    console.log('   Created:', authUser.created_at);

    // Step 2: Check if users record already exists
    console.log('\n2️⃣  Checking users table...');
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingUser) {
      console.log('✅ User record already exists:');
      console.log(existingUser);
      console.log('\n🎉 You\'re all set! Try logging in to https://ops.sailorskills.com');
      return;
    }

    // Step 3: Create users table record
    console.log('📝 No users record found. Creating...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || 'Brian',
        role: 'owner',
        user_type: 'owner',
        active: true,
        phone: null,
        hire_date: new Date().toISOString().split('T')[0],
        hourly_rate: null
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      console.error('   Details:', userError);
      process.exit(1);
    }

    console.log('✅ User record created:', userData);

    // Step 4: Update auth user metadata to mark as staff
    console.log('\n3️⃣  Updating auth metadata...');
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      {
        user_metadata: {
          user_type: 'staff',
          role: 'owner',
          full_name: 'Brian',
          user_type_detail: 'owner'
        }
      }
    );

    if (updateError) {
      console.warn('⚠️  Warning: Could not update auth metadata:', updateError.message);
    } else {
      console.log('✅ Auth metadata updated');
    }

    console.log('\n🎉 Success! Your account is now linked.\n');
    console.log('Next steps:');
    console.log('1. Go to https://ops.sailorskills.com');
    console.log('2. Log in with: standardhuman@gmail.com');
    console.log('3. You should now see the "Users" link in the navigation');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

linkAuthUser();
