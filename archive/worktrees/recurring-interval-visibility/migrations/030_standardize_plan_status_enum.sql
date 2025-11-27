-- Migration 030: Standardize plan_status to ENUM
-- Purpose: Convert plan_status from inconsistent text values to standardized ENUM
-- Date: 2025-11-11
-- Part of: Automated Boat Status Tracking System (Phase 1)

BEGIN;

-- Create ENUM type for boat plan status
CREATE TYPE boat_plan_status AS ENUM (
    'active',              -- Active recurring subscription
    'one_time_active',     -- One-time service in progress (expires after 30 days)
    'expired',             -- One-time completed >30 days ago or subscription expired
    'cancelled',           -- Manually cancelled by admin
    'paused',              -- Billing issue or seasonal hold
    'declined',            -- Service declined by customer
    'never_started'        -- No services ordered yet
);

-- Add comment on the ENUM type
COMMENT ON TYPE boat_plan_status IS 'Standardized boat subscription/service status values';

-- Add temporary column with new ENUM type
ALTER TABLE boats ADD COLUMN plan_status_new boat_plan_status;

-- Migrate existing data to standardized values
UPDATE boats SET plan_status_new = CASE
    -- Active subscriptions
    WHEN plan_status = 'Subbed' THEN 'active'::boat_plan_status
    WHEN plan_status = '1' THEN 'active'::boat_plan_status  -- Zeno with unclear status, treating as active

    -- Expired
    WHEN plan_status = 'Expired' THEN 'expired'::boat_plan_status

    -- Cancelled
    WHEN plan_status = 'Cancelled' THEN 'cancelled'::boat_plan_status

    -- Paused
    WHEN plan_status = 'Paused' THEN 'paused'::boat_plan_status

    -- Declined
    WHEN plan_status = 'Declined' THEN 'declined'::boat_plan_status

    -- Never started
    WHEN plan_status = 'Not started' THEN 'never_started'::boat_plan_status

    -- NULL values for boats with recent services (per handoff: Blow Fish, Lil Bear, Maris, Mazu, Raindancer II, Zeno)
    -- and test boats - treating as active since is_active=true was set for them
    WHEN plan_status IS NULL AND is_active = TRUE THEN 'active'::boat_plan_status

    -- NULL values for inactive boats - never started
    WHEN plan_status IS NULL AND is_active = FALSE THEN 'never_started'::boat_plan_status

    -- Default fallback (should not be hit)
    ELSE 'never_started'::boat_plan_status
END;

-- Drop old column and rename new one
ALTER TABLE boats DROP COLUMN plan_status;
ALTER TABLE boats RENAME COLUMN plan_status_new TO plan_status;

-- Set NOT NULL constraint (every boat should have a status)
ALTER TABLE boats ALTER COLUMN plan_status SET NOT NULL;

-- Set default for new boats
ALTER TABLE boats ALTER COLUMN plan_status SET DEFAULT 'never_started'::boat_plan_status;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_boats_plan_status ON boats(plan_status);

-- Add comment
COMMENT ON COLUMN boats.plan_status IS 'Boat subscription/service status (standardized ENUM)';

COMMIT;
