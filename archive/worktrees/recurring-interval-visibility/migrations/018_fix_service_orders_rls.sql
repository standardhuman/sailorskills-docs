-- Fix service_orders RLS policies to use auth.uid() pattern
-- This aligns with other tables (customers, marinas, service_logs, invoices)
--
-- Root Cause: The old is_admin_user() function used auth.jwt()->>'email'
--   which is less reliable than auth.uid()
--
-- Solution: Use get_user_role(auth.uid()) pattern like other policies

-- Drop existing policies
DROP POLICY IF EXISTS service_orders_select ON service_orders;
DROP POLICY IF EXISTS service_orders_insert ON service_orders;
DROP POLICY IF EXISTS service_orders_update ON service_orders;
DROP POLICY IF EXISTS service_orders_delete ON service_orders;

-- Recreate policies using consistent pattern with other tables
CREATE POLICY service_orders_select ON service_orders
  FOR SELECT
  USING (
    -- Staff users can view all orders
    get_user_role(auth.uid()) IN ('owner', 'admin', 'technician', 'contractor', 'viewer')
  );

CREATE POLICY service_orders_insert ON service_orders
  FOR INSERT
  WITH CHECK (true); -- Anyone can create orders (comes from estimator)

CREATE POLICY service_orders_update ON service_orders
  FOR UPDATE
  USING (
    -- Only owner/admin can update orders
    get_user_role(auth.uid()) IN ('owner', 'admin')
  )
  WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY service_orders_delete ON service_orders
  FOR DELETE
  USING (
    -- Only owner/admin can delete orders
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Verify policies are applied
SELECT
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'service_orders'
ORDER BY cmd, policyname;
