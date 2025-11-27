-- Migration 016: Inventory RLS Policies
-- Date: 2025-11-04
-- Description: Add row-level security for inventory tables

-- ============================================================
-- INVENTORY_ITEMS TABLE RLS
-- ============================================================

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

-- All staff can view inventory items
CREATE POLICY "inventory_items_select_staff" ON inventory_items
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
  );

-- Only owners/admins can insert inventory items
CREATE POLICY "inventory_items_insert_admin" ON inventory_items
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Only owners/admins can update inventory items
CREATE POLICY "inventory_items_update_admin" ON inventory_items
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Only owners/admins can delete inventory items
CREATE POLICY "inventory_items_delete_admin" ON inventory_items
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

COMMENT ON POLICY "inventory_items_select_staff" ON inventory_items IS 'All staff can view inventory items';
COMMENT ON POLICY "inventory_items_insert_admin" ON inventory_items IS 'Only owners/admins can add inventory items';
COMMENT ON POLICY "inventory_items_update_admin" ON inventory_items IS 'Only owners/admins can update inventory items';
COMMENT ON POLICY "inventory_items_delete_admin" ON inventory_items IS 'Only owners/admins can delete inventory items';

-- ============================================================
-- INVENTORY_TRANSACTIONS TABLE RLS
-- ============================================================

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- All staff can view inventory transactions
CREATE POLICY "inventory_transactions_select_staff" ON inventory_transactions
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
  );

-- Only owners/admins can insert transactions (creating new transactions)
CREATE POLICY "inventory_transactions_insert_admin" ON inventory_transactions
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

COMMENT ON POLICY "inventory_transactions_select_staff" ON inventory_transactions IS 'All staff can view inventory transactions';
COMMENT ON POLICY "inventory_transactions_insert_admin" ON inventory_transactions IS 'Only owners/admins can create inventory transactions';
