-- Migration 029: Create Boat Status History Table
-- Purpose: Create audit trail for all boat status changes
-- Date: 2025-11-11
-- Part of: Automated Boat Status Tracking System (Phase 1)

BEGIN;

-- Create boat_status_history table for audit trail
CREATE TABLE IF NOT EXISTS boat_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    old_is_active BOOLEAN,
    new_is_active BOOLEAN NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    related_order_id UUID REFERENCES service_orders(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE boat_status_history IS 'Audit trail of all boat status changes';
COMMENT ON COLUMN boat_status_history.boat_id IS 'Reference to boat';
COMMENT ON COLUMN boat_status_history.old_status IS 'Previous plan_status value';
COMMENT ON COLUMN boat_status_history.new_status IS 'New plan_status value';
COMMENT ON COLUMN boat_status_history.old_is_active IS 'Previous is_active value';
COMMENT ON COLUMN boat_status_history.new_is_active IS 'New is_active value';
COMMENT ON COLUMN boat_status_history.changed_at IS 'When the status changed';
COMMENT ON COLUMN boat_status_history.changed_by IS 'User who made the change (NULL for automated changes)';
COMMENT ON COLUMN boat_status_history.reason IS 'Reason for status change';
COMMENT ON COLUMN boat_status_history.related_order_id IS 'Service order that triggered the change (if applicable)';
COMMENT ON COLUMN boat_status_history.notes IS 'Additional notes about the change';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_boat_status_history_boat_id ON boat_status_history(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_status_history_changed_at ON boat_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_boat_status_history_changed_by ON boat_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_boat_status_history_related_order ON boat_status_history(related_order_id);

-- Enable Row Level Security
ALTER TABLE boat_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Staff can view all history
CREATE POLICY "Staff can view all boat status history"
    ON boat_status_history FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'staff')
        )
    );

-- Only system/staff can insert (logged changes)
CREATE POLICY "Staff can insert boat status history"
    ON boat_status_history FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'staff')
        )
    );

-- No updates or deletes (audit trail immutability)
-- History records should never be modified or deleted

COMMIT;
