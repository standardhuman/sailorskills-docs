-- Setup admin RLS policy for invoices table
-- Date: 2025-10-28
-- Purpose: Allow admin users in billing dashboard to view all invoices

-- 1. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM admin_users
    WHERE email = auth.jwt()->>'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add admin policy to invoices table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'invoices'
      AND policyname = 'Allow admins to view all invoices'
  ) THEN
    CREATE POLICY "Allow admins to view all invoices"
    ON invoices
    FOR SELECT
    TO authenticated
    USING (is_admin_user());
  END IF;
END $$;

-- 3. Add admin user (replace with actual admin email)
-- Example:
-- INSERT INTO admin_users (id, email, created_at)
-- SELECT id, email, NOW()
-- FROM auth.users
-- WHERE email = 'admin@example.com'
-- ON CONFLICT (email) DO NOTHING;

-- Verification query
-- SELECT policyname, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'invoices';
