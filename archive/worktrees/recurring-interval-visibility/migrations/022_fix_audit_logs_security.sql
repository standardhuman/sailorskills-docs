-- Migration 022: Fix Audit Logs Security
-- Date: 2025-11-05
-- Purpose: Change log_audit_trail() to SECURITY DEFINER so it can bypass RLS
--
-- Problem: Function runs as SECURITY INVOKER, so it inherits the calling user's
--          permissions. When creating service_orders, the audit trigger tries to
--          insert into audit_logs, but RLS policy blocks all inserts (USING false).
--
-- Solution: Change function to SECURITY DEFINER so it runs with elevated
--           privileges and can insert into audit_logs regardless of RLS.

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER
SECURITY DEFINER  -- Run with function owner's privileges (postgres)
SET search_path = public  -- Security best practice with SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    changes,
    ip_address,
    service_name,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', row_to_json(OLD))
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', row_to_json(NEW))
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    END,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('app.service_name', true),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Verify the change
\df+ log_audit_trail

-- Test comment
COMMENT ON FUNCTION log_audit_trail() IS 'Automatically log all table changes to audit_logs (runs with elevated privileges to bypass RLS)';
