#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Admin key for user creation
)

const testUsers = [
  {
    email: 'customer-test@sailorskills.com',
    password: 'TestCustomer123!',
    role: 'customer',
    serviceAccess: { portal: true, booking: true }
  },
  {
    email: 'staff-test@sailorskills.com',
    password: 'TestStaff123!',
    role: 'staff',
    serviceAccess: { operations: true, billing: true, inventory: true }
  },
  {
    email: 'admin-test@sailorskills.com',
    password: 'TestAdmin123!',
    role: 'admin',
    serviceAccess: { '*': true }
  }
]

async function createTestUsers() {
  console.log('Creating test users...\n')

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.error(`❌ Failed to create ${user.role}:`, authError.message)
        continue
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          role: user.role,
          service_access: user.serviceAccess,
          is_active: true
        })

      if (profileError) {
        console.error(`❌ Failed to create profile for ${user.role}:`, profileError.message)
        continue
      }

      console.log(`✅ Created ${user.role}: ${user.email}`)
      console.log(`   User ID: ${authData.user.id}`)
      console.log(`   Password: ${user.password}\n`)

    } catch (error) {
      console.error(`❌ Error creating ${user.role}:`, error.message)
    }
  }

  console.log('Done!')
}

createTestUsers()
