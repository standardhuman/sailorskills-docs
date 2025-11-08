-- Fix RLS policy for email_templates table
-- Date: 2025-11-08
-- Purpose: Allow authenticated users to read and update email templates

-- Drop existing restrictive policies if any
DROP POLICY IF EXISTS "Admin only: email_templates" ON email_templates;
DROP POLICY IF EXISTS "Authenticated read: email_templates" ON email_templates;

-- Allow authenticated users to read templates (admin check done in app code)
CREATE POLICY "Authenticated read: email_templates"
  ON email_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update templates (admin check done in app code)
CREATE POLICY "Authenticated update: email_templates"
  ON email_templates
  FOR UPDATE
  TO authenticated
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
