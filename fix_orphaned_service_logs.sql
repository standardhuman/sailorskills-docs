-- Fix Orphaned Service Logs Migration
-- Date: 2025-10-26
-- Issue: 179 service logs have NULL boat_id, preventing Operations from showing service history
-- Root cause: Notion migration failed to link some logs to boats

-- =============================================================================
-- PHASE 1: Auto-fix single-boat customers
-- =============================================================================

-- Step 1: Preview what will be updated (single-boat customers only)
SELECT
  sl.id as service_log_id,
  sl.service_date,
  sl.customer_id,
  c.name as customer_name,
  b.id as boat_id_to_assign,
  b.boat_name
FROM service_logs sl
JOIN customers c ON sl.customer_id::uuid = c.id
JOIN boats b ON c.id = b.customer_id
WHERE sl.boat_id IS NULL
  AND sl.customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (
    -- Only customers with exactly ONE boat
    SELECT COUNT(*) FROM boats WHERE customer_id = c.id
  ) = 1
ORDER BY sl.service_date DESC;

-- Step 2: Execute the update for single-boat customers
WITH single_boat_customers AS (
  SELECT DISTINCT
    sl.customer_id::uuid as customer_uuid,
    b.id as boat_id
  FROM service_logs sl
  JOIN boats b ON sl.customer_id::uuid = b.customer_id
  WHERE sl.boat_id IS NULL
    AND sl.customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (SELECT COUNT(*) FROM boats WHERE customer_id = b.customer_id) = 1
)
UPDATE service_logs
SET boat_id = sbc.boat_id
FROM single_boat_customers sbc
WHERE service_logs.boat_id IS NULL
  AND service_logs.customer_id::uuid = sbc.customer_uuid;

-- =============================================================================
-- PHASE 2: Handle multi-boat customers (MANUAL REVIEW REQUIRED)
-- =============================================================================

-- Sharon Greenhagen has 3 boats: Second Wind, Heartstring, Deux Coeurs
-- Fred Cook has 2 boats: SEQUOIA, Sequoia (likely duplicates)

-- Preview multi-boat customer orphaned logs
SELECT
  sl.id as service_log_id,
  sl.service_date,
  sl.service_name,
  sl.notes,
  c.name as customer_name,
  array_agg(b.boat_name) as available_boats
FROM service_logs sl
JOIN customers c ON sl.customer_id::uuid = c.id
JOIN boats b ON c.id = b.customer_id
WHERE sl.boat_id IS NULL
  AND sl.customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (SELECT COUNT(*) FROM boats WHERE customer_id = c.id) > 1
GROUP BY sl.id, sl.service_date, sl.service_name, sl.notes, c.name
ORDER BY c.name, sl.service_date DESC;

-- Option A: Assign to first boat (alphabetically) - UNCOMMENT TO USE
-- UPDATE service_logs
-- SET boat_id = (
--   SELECT b.id
--   FROM boats b
--   WHERE b.customer_id = service_logs.customer_id::uuid
--   ORDER BY b.boat_name
--   LIMIT 1
-- )
-- WHERE boat_id IS NULL
--   AND customer_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
--   AND (SELECT COUNT(*) FROM boats WHERE customer_id = service_logs.customer_id::uuid) > 1;

-- =============================================================================
-- PHASE 3: Handle Stripe customer IDs
-- =============================================================================

-- Preview Stripe customer ID orphaned logs
SELECT
  sl.id as service_log_id,
  sl.service_date,
  sl.customer_id as stripe_customer_id,
  c.id as uuid_customer_id,
  c.name as customer_name,
  b.boat_name
FROM service_logs sl
LEFT JOIN customers c ON sl.customer_id = c.stripe_customer_id
LEFT JOIN boats b ON c.id = b.customer_id
WHERE sl.boat_id IS NULL
  AND sl.customer_id LIKE 'cus_%';

-- Update logs with Stripe IDs (assumes one boat per Stripe customer)
UPDATE service_logs
SET boat_id = (
  SELECT b.id
  FROM customers c
  JOIN boats b ON c.id = b.customer_id
  WHERE c.stripe_customer_id = service_logs.customer_id
  LIMIT 1
)
WHERE boat_id IS NULL
  AND customer_id LIKE 'cus_%'
  AND EXISTS (
    SELECT 1
    FROM customers c
    WHERE c.stripe_customer_id = service_logs.customer_id
  );

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check remaining orphaned logs
SELECT
  COUNT(*) as remaining_orphaned_logs,
  COUNT(DISTINCT customer_id) as affected_customers
FROM service_logs
WHERE boat_id IS NULL;

-- Show details of any remaining orphaned logs
SELECT
  id,
  service_date,
  customer_id,
  service_type,
  notes
FROM service_logs
WHERE boat_id IS NULL
ORDER BY service_date DESC;

-- Verify fix: Count boats with service history before and after
SELECT
  (SELECT COUNT(DISTINCT boat_id) FROM service_logs WHERE boat_id IS NOT NULL) as boats_with_history,
  (SELECT COUNT(*) FROM boats) as total_boats;

-- Show sample of updated logs
SELECT
  b.boat_name,
  COUNT(sl.id) as service_log_count,
  MIN(sl.service_date) as earliest_service,
  MAX(sl.service_date) as latest_service
FROM service_logs sl
JOIN boats b ON sl.boat_id = b.id
WHERE sl.updated_at > NOW() - INTERVAL '1 hour'
GROUP BY b.id, b.boat_name
ORDER BY service_log_count DESC
LIMIT 10;
