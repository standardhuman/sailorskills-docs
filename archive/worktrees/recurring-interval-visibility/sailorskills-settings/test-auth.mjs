#!/usr/bin/env node

/**
 * Test authentication flow
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
  console.log('Testing authentication...\n');

  const testEmail = 'standardhuman@gmail.com';
  const testPassword = 'KLRss!650';

  try {
    // Try to sign in
    console.log(`Signing in as ${testEmail}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (authError) {
      console.error('❌ Sign in failed:', authError.message);
      return;
    }

    console.log('✅ Sign in successful!');
    console.log('User ID:', authData.user.id);

    // Check if user has profile
    console.log('\nChecking user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (profileError) {
      console.error('❌ Profile query failed:', profileError.message);
      console.log('\nUser needs a profile created. Run this SQL:');
      console.log(`INSERT INTO user_profiles (user_id, role) VALUES ('${authData.user.id}', 'admin');`);
      return;
    }

    console.log('✅ Profile found!');
    console.log('Role:', profile.role);
    console.log('Is Active:', profile.is_active);

    if (profile.role !== 'admin') {
      console.log('\n⚠️  User is not an admin. Run this SQL to upgrade:');
      console.log(`UPDATE user_profiles SET role = 'admin' WHERE user_id = '${authData.user.id}';`);
      return;
    }

    console.log('\n✅ User is an admin! Ready to access Settings service.');

    // Test pricing config query
    console.log('\nTesting pricing config query...');
    const { data: pricing, error: pricingError } = await supabase
      .from('business_pricing_config')
      .select('*')
      .limit(3);

    if (pricingError) {
      console.error('❌ Pricing query failed:', pricingError.message);
      return;
    }

    console.log(`✅ Successfully loaded ${pricing.length} pricing records`);

    // Sign out
    await supabase.auth.signOut();
    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuth();
