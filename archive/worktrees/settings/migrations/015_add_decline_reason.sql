-- Migration: 015_add_decline_reason.sql
-- Date: 2025-11-03
-- Purpose: Add decline_reason column to service_orders for tracking admin-provided reasons when declining orders

ALTER TABLE service_orders
ADD COLUMN decline_reason TEXT;

COMMENT ON COLUMN service_orders.decline_reason IS
  'Reason provided by admin when declining/rejecting order. NULL if order not declined.';
