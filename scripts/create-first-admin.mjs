#!/usr/bin/env node
/**
 * Create First Admin User
 *
 * This script creates the first admin user in the system.
 * Run this ONCE to bootstrap the user management system.
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
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease check your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createFirstAdmin() {
  console.log('\n🔐 Creating First Admin User\n');

  // Prompt for user details
  const email = 'standardhuman@gmail.com'; // Using the login from CLAUDE.md
  const password = 'KLRss!650'; // Using the password from CLAUDE.md
  const fullName = 'Brian';
  const role = 'owner';
  const userType = 'owner';

  console.log('📝 User details:');
  console.log('   Email:', email);
  console.log('   Name:', fullName);
  console.log('   Role:', role);
  console.log('   Type:', userType);
  console.log('');

  try {
    // Step 1: Create Supabase Auth user
    console.log('1️⃣  Creating Supabase Auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification for first admin
      user_metadata: {
        user_type: 'staff',
        role: role,
        full_name: fullName,
        user_type_detail: userType
      }
    });

    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      process.exit(1);
    }

    console.log('✅ Auth user created:', authData.user.id);

    // Step 2: Create users table record
    console.log('\n2️⃣  Creating users table record...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        user_type: userType,
        active: true,
        phone: null,
        hire_date: new Date().toISOString().split('T')[0],
        hourly_rate: null
      })
      .select()
      .single();

    if (userError) {
      console.error('❌ Error creating user record:', userError.message);
      console.log('\n⚠️  Auth user was created but users table record failed.');
      console.log('   You may need to manually insert the record or delete and retry.');
      process.exit(1);
    }

    console.log('✅ User record created');

    // Step 3: Verify
    console.log('\n3️⃣  Verifying user...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('users')
      .select('id, email, full_name, role, user_type, active')
      .eq('id', authData.user.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying user:', verifyError.message);
      process.exit(1);
    }

    console.log('✅ User verified:', verifyData);

    console.log('\n🎉 Success! First admin user created.\n');
    console.log('You can now log in at:');
    console.log('   https://ops.sailorskills.com');
    console.log('');
    console.log('Credentials:');
    console.log('   Email:', email);
    console.log('   Password: (the one from CLAUDE.md)');
    console.log('');
    console.log('After logging in, you will see the "Users" link in the navigation.');
    console.log('');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

createFirstAdmin();
