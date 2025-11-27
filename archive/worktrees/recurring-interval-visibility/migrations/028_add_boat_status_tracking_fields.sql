-- Migration 028: Add Boat Status Tracking Fields
-- Purpose: Add fields to boats table for tracking status changes and service dates
-- Date: 2025-11-11
-- Part of: Automated Boat Status Tracking System (Phase 1)

BEGIN;

-- Add status tracking fields to boats table
ALTER TABLE boats ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES auth.users(id);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS status_change_reason TEXT;
ALTER TABLE boats ADD COLUMN IF NOT EXISTS last_order_date DATE;

-- Note: last_service_date is similar to existing last_service column
-- We'll use last_service as last_service_date (rename not needed)

-- Add comments for documentation
COMMENT ON COLUMN boats.status_changed_at IS 'Timestamp when boat status last changed';
COMMENT ON COLUMN boats.status_changed_by IS 'User who changed the boat status (admin)';
COMMENT ON COLUMN boats.status_change_reason IS 'Reason for status change (cancellation, pause, etc.)';
COMMENT ON COLUMN boats.last_order_date IS 'Date of most recent service order';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_boats_status_changed_at ON boats(status_changed_at);
CREATE INDEX IF NOT EXISTS idx_boats_last_order_date ON boats(last_order_date);

COMMIT;
