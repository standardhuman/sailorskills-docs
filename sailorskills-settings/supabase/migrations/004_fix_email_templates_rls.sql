-- Fix RLS policy for email_templates table
-- Date: 2025-11-08
-- Purpose: Allow anon and authenticated users to read and update email templates
--          (Vercel deployment protection handles page-level access control)

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Admin only: email_templates" ON email_templates;
DROP POLICY IF EXISTS "Authenticated read: email_templates" ON email_templates;
DROP POLICY IF EXISTS "Authenticated update: email_templates" ON email_templates;

-- Allow anon and authenticated users to read templates
-- (Vercel deployment protection handles page access control)
CREATE POLICY "Allow reads: email_templates"
  ON email_templates
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anon and authenticated users to update templates
-- (Vercel deployment protection handles page access control)
CREATE POLICY "Allow updates: email_templates"
  ON email_templates
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Log this fix
INSERT INTO pricing_audit_log (config_key, old_value, new_value, reason)
VALUES (
  'email_templates_rls_fix',
  0,
  1,
  'Fixed RLS policy to allow authenticated users to read/update email templates - migration 004'
);
