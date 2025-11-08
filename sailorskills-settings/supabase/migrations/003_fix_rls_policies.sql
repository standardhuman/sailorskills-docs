-- Fix RLS policies for Settings service authentication
-- Date: 2025-11-07
-- Purpose: Allow authenticated users to access pricing config (admin check done in app code)

-- Update business_pricing_config policy to allow authenticated reads
DROP POLICY IF EXISTS "Admin only: business_pricing_config" ON business_pricing_config;
CREATE POLICY "Authenticated read: business_pricing_config"
  ON business_pricing_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: Admin user profile should be created for production admin user
-- Example:
-- INSERT INTO user_profiles (user_id, role)
-- VALUES ('[production-admin-user-id]', 'admin')
-- ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
