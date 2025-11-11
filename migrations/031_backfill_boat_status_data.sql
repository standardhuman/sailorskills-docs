-- Migration 031: Backfill Boat Status Data
-- Purpose: Backfill last_order_date from service_orders and create initial status history
-- Date: 2025-11-11
-- Part of: Automated Boat Status Tracking System (Phase 1)

BEGIN;

-- Backfill last_order_date from most recent service_orders
UPDATE boats
SET last_order_date = subquery.latest_order_date
FROM (
    SELECT
        boat_id,
        MAX(created_at::date) as latest_order_date
    FROM service_orders
    WHERE boat_id IS NOT NULL
    GROUP BY boat_id
) AS subquery
WHERE boats.id = subquery.boat_id;

-- Note: last_service column already exists and should already be populated
-- If needed, we can update it from service_logs
UPDATE boats
SET last_service = COALESCE(boats.last_service, subquery.latest_service_date)
FROM (
    SELECT
        boat_id,
        MAX(service_date) as latest_service_date
    FROM service_logs
    WHERE boat_id IS NOT NULL
    GROUP BY boat_id
) AS subquery
WHERE boats.id = subquery.boat_id
AND boats.last_service IS NULL;  -- Only update if not already set

-- Create initial boat_status_history entries for all boats
-- This provides a baseline for the audit trail
INSERT INTO boat_status_history (
    boat_id,
    old_status,
    new_status,
    old_is_active,
    new_is_active,
    changed_at,
    changed_by,
    reason,
    notes
)
SELECT
    id as boat_id,
    NULL as old_status,  -- No previous status for initial entry
    plan_status::text as new_status,
    NULL as old_is_active,
    is_active as new_is_active,
    COALESCE(status_changed_at, updated_at, created_at) as changed_at,
    status_changed_by as changed_by,
    'Initial status from migration' as reason,
    CASE
        WHEN status_change_reason IS NOT NULL
        THEN 'Original reason: ' || status_change_reason
        ELSE 'Baseline status entry created during system migration'
    END as notes
FROM boats
WHERE NOT EXISTS (
    SELECT 1 FROM boat_status_history WHERE boat_status_history.boat_id = boats.id
);

-- Update status_changed_at for boats that don't have it set
UPDATE boats
SET status_changed_at = COALESCE(status_changed_at, updated_at, created_at)
WHERE status_changed_at IS NULL;

COMMIT;
