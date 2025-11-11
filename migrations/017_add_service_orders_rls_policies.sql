-- Migration 017: Add Missing RLS Policies for service_orders
-- Date: 2025-11-04
-- Description: Migration 016 added audit columns but forgot RLS policies for service_orders
-- This migration adds the missing policies following the invoices pattern

-- ============================================================
-- SERVICE ORDERS TABLE RLS POLICIES
-- ============================================================

-- Remove any existing policies (old and new)
DROP POLICY IF EXISTS "Allow authenticated read access to service_orders" ON service_orders;
DROP POLICY IF EXISTS "Allow authenticated write access to service_orders" ON service_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON service_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON service_orders;
DROP POLICY IF EXISTS "Public can insert service_orders" ON service_orders;
DROP POLICY IF EXISTS "Public can view service orders" ON service_orders;
DROP POLICY IF EXISTS "Public can view service_orders" ON service_orders;
DROP POLICY IF EXISTS "Service role can manage service orders" ON service_orders;
DROP POLICY IF EXISTS "service_orders_select" ON service_orders;
DROP POLICY IF EXISTS "service_orders_insert" ON service_orders;
DROP POLICY IF EXISTS "service_orders_update" ON service_orders;
DROP POLICY IF EXISTS "service_orders_delete" ON service_orders;

-- Staff can view all orders (using is_admin_user which checks admin_users table)
-- This is compatible with existing auth patterns in the codebase
CREATE POLICY "service_orders_select" ON service_orders
  FOR SELECT USING (
    is_admin_user()
  );

-- Staff can create service orders (using same auth pattern as SELECT)
CREATE POLICY "service_orders_insert" ON service_orders
  FOR INSERT WITH CHECK (
    is_admin_user()
  );

-- Staff can update service orders (confirm, decline, schedule)
CREATE POLICY "service_orders_update" ON service_orders
  FOR UPDATE USING (
    is_admin_user()
  )
  WITH CHECK (
    is_admin_user()
  );

-- Staff can delete service orders
CREATE POLICY "service_orders_delete" ON service_orders
  FOR DELETE USING (
    is_admin_user()
  );

COMMENT ON POLICY "service_orders_select" ON service_orders IS 'Staff can view all orders';
COMMENT ON POLICY "service_orders_insert" ON service_orders IS 'Staff can create service orders';
COMMENT ON POLICY "service_orders_update" ON service_orders IS 'Staff can confirm/decline/schedule orders';
COMMENT ON POLICY "service_orders_delete" ON service_orders IS 'Staff can delete service orders';
