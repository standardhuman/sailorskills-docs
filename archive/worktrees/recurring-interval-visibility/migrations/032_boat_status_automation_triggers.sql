-- Migration 032: Boat Status Automation Triggers
-- Purpose: Create triggers for automatic boat status updates based on service orders
-- Date: 2025-11-11
-- Part of: Automated Boat Status Tracking System (Phase 1)

BEGIN;

-- ============================================================================
-- Helper Function: Log status change to history
-- ============================================================================
CREATE OR REPLACE FUNCTION log_boat_status_change(
    p_boat_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_old_is_active BOOLEAN,
    p_new_is_active BOOLEAN,
    p_changed_by UUID,
    p_reason TEXT,
    p_related_order_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO boat_status_history (
        boat_id,
        old_status,
        new_status,
        old_is_active,
        new_is_active,
        changed_at,
        changed_by,
        reason,
        related_order_id,
        notes
    ) VALUES (
        p_boat_id,
        p_old_status,
        p_new_status,
        p_old_is_active,
        p_new_is_active,
        NOW(),
        p_changed_by,
        p_reason,
        p_related_order_id,
        p_notes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_boat_status_change IS 'Helper function to log boat status changes to audit trail';

-- ============================================================================
-- Trigger Function 1: Auto-activate boat on recurring order
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_activate_boat_on_recurring_order()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status TEXT;
    v_old_is_active BOOLEAN;
    v_requires_approval BOOLEAN := FALSE;
BEGIN
    -- Only process confirmed recurring orders (1-mo, 2-mo, 3-mo)
    IF NEW.status = 'confirmed' AND
       NEW.service_interval IN ('1-mo', '2-mo', '3-mo') AND
       NEW.boat_id IS NOT NULL THEN

        -- Get current boat status
        SELECT plan_status::text, is_active
        INTO v_old_status, v_old_is_active
        FROM boats
        WHERE id = NEW.boat_id;

        -- Check if boat was cancelled (requires manual approval)
        IF v_old_status = 'cancelled' THEN
            -- Set order to pending_approval instead of confirming
            NEW.status := 'pending_approval';
            v_requires_approval := TRUE;

            -- Log that reactivation requires approval
            PERFORM log_boat_status_change(
                NEW.boat_id,
                v_old_status,
                'pending_reactivation',
                v_old_is_active,
                v_old_is_active,  -- No change yet
                auth.uid(),
                'Reactivation pending approval - boat was previously cancelled',
                NEW.id,
                'Order set to pending_approval status - admin must approve before boat reactivates'
            );

            RETURN NEW;  -- Exit early, don't activate yet
        END IF;

        -- For expired or other inactive boats: auto-reactivate
        UPDATE boats
        SET
            is_active = TRUE,
            plan_status = 'active'::boat_plan_status,
            last_order_date = NEW.created_at::date,
            status_changed_at = NOW(),
            status_changed_by = auth.uid(),
            status_change_reason = 'Auto-activated by recurring service order',
            updated_at = NOW()
        WHERE id = NEW.boat_id
        AND (is_active = FALSE OR plan_status != 'active');

        -- If status changed, log it
        IF FOUND THEN
            -- Activate related service schedules
            UPDATE service_schedules
            SET
                is_active = TRUE,
                updated_at = NOW()
            WHERE boat_id = NEW.boat_id
            AND is_active = FALSE;

            -- Log the status change
            PERFORM log_boat_status_change(
                NEW.boat_id,
                v_old_status,
                'active',
                v_old_is_active,
                TRUE,
                auth.uid(),
                'Auto-activated by recurring service order',
                NEW.id,
                'Boat activated with ' || NEW.service_interval || ' recurring service'
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on service_orders
DROP TRIGGER IF EXISTS trigger_auto_activate_boat ON service_orders;
CREATE TRIGGER trigger_auto_activate_boat
    BEFORE INSERT OR UPDATE OF status
    ON service_orders
    FOR EACH ROW
    EXECUTE FUNCTION auto_activate_boat_on_recurring_order();

COMMENT ON FUNCTION auto_activate_boat_on_recurring_order IS 'Automatically activates boat when recurring service order is confirmed';

-- ============================================================================
-- Trigger Function 2: Set one_time_active when one-time service completes
-- ============================================================================
CREATE OR REPLACE FUNCTION set_one_time_active_on_completion()
RETURNS TRIGGER AS $$
DECLARE
    v_old_status TEXT;
    v_old_is_active BOOLEAN;
BEGIN
    -- Only process completed one-time orders
    IF NEW.status = 'completed' AND
       OLD.status != 'completed' AND
       NEW.service_interval = 'one-time' AND
       NEW.boat_id IS NOT NULL THEN

        -- Get current boat status
        SELECT plan_status::text, is_active
        INTO v_old_status, v_old_is_active
        FROM boats
        WHERE id = NEW.boat_id;

        -- Update boat to one_time_active status
        UPDATE boats
        SET
            plan_status = 'one_time_active'::boat_plan_status,
            is_active = TRUE,
            last_service = COALESCE(NEW.completed_at::date, CURRENT_DATE),
            last_order_date = NEW.created_at::date,
            status_changed_at = NOW(),
            status_changed_by = auth.uid(),
            status_change_reason = 'One-time service completed - 30 day expiration timer started',
            updated_at = NOW()
        WHERE id = NEW.boat_id;

        -- Log the status change
        PERFORM log_boat_status_change(
            NEW.boat_id,
            v_old_status,
            'one_time_active',
            v_old_is_active,
            TRUE,
            auth.uid(),
            'One-time service completed',
            NEW.id,
            'Service completed on ' || COALESCE(NEW.completed_at::date, CURRENT_DATE)::text || ' - will expire after 30 days'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on service_orders
DROP TRIGGER IF EXISTS trigger_set_one_time_active ON service_orders;
CREATE TRIGGER trigger_set_one_time_active
    AFTER UPDATE OF status
    ON service_orders
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION set_one_time_active_on_completion();

COMMENT ON FUNCTION set_one_time_active_on_completion IS 'Sets boat to one_time_active when one-time service completes, starting 30-day expiration timer';

COMMIT;
