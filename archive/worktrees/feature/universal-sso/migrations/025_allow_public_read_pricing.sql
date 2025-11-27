-- Migration: Allow public (anonymous) read access to business_pricing_config
-- Purpose: Estimator service needs to read pricing without authentication
-- Date: 2025-11-07

-- Drop existing admin-only policy
DROP POLICY IF EXISTS "Admin only: business_pricing_config" ON business_pricing_config;

-- Create read-only policy for public (SELECT only)
CREATE POLICY "Public read access to pricing config"
ON business_pricing_config
FOR SELECT
TO public
USING (true);

-- Create admin-only policy for modifications (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin only: modify pricing config"
ON business_pricing_config
FOR ALL
TO public
USING (is_admin())
WITH CHECK (is_admin());

-- Verify policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename = 'business_pricing_config'
ORDER BY policyname;
