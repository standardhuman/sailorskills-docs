-- Migration: Backfill total_hours for existing service logs
-- Date: 2025-11-06
-- Description: Calculate and populate total_hours for service logs that have timestamps but missing duration

-- ============================================================================
-- Backfill Strategy
-- ============================================================================
-- This migration populates total_hours for existing service_logs records where:
-- 1. Both service_started_at and service_ended_at exist (TIMESTAMPTZ fields)
--    OR both time_in and time_out exist (TIME fields from Notion imports)
-- 2. total_hours is currently NULL
-- 3. The calculated duration is reasonable (>= 0 and <= 24 hours)

-- ============================================================================
-- Step 1: Review what will be updated (safety check)
-- ============================================================================

-- Check how many records will be affected
SELECT
  COUNT(*) as records_to_update,
  COUNT(*) FILTER (WHERE service_started_at IS NOT NULL AND service_ended_at IS NOT NULL) as has_both_timestamps,
  COUNT(*) FILTER (WHERE time_in IS NOT NULL AND time_out IS NOT NULL) as has_both_times,
  COUNT(*) FILTER (WHERE total_hours IS NULL) as missing_total_hours
FROM service_logs
WHERE total_hours IS NULL
  AND (
    (service_started_at IS NOT NULL AND service_ended_at IS NOT NULL)
    OR (time_in IS NOT NULL AND time_out IS NOT NULL)
  );

-- Preview calculated values (first 10 records)
SELECT
  id,
  boat_id,
  service_date,
  time_in,
  time_out,
  service_started_at,
  service_ended_at,
  total_hours as current_total_hours,
  CASE
    -- Calculate from TIMESTAMPTZ fields if available
    WHEN service_started_at IS NOT NULL AND service_ended_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (service_ended_at - service_started_at)) / 3600
    -- Otherwise calculate from TIME fields
    WHEN time_in IS NOT NULL AND time_out IS NOT NULL THEN
      EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
    ELSE NULL
  END as calculated_hours,
  CASE
    WHEN service_started_at IS NOT NULL AND service_ended_at IS NOT NULL THEN 'From timestamps'
    WHEN time_in IS NOT NULL AND time_out IS NOT NULL THEN 'From time fields'
    ELSE 'No data'
  END as calculation_source,
  CASE
    WHEN EXTRACT(EPOCH FROM (COALESCE(service_ended_at::time, time_out) - COALESCE(service_started_at::time, time_in))) / 3600 < 0 THEN 'NEGATIVE - INVALID'
    WHEN EXTRACT(EPOCH FROM (COALESCE(service_ended_at::time, time_out) - COALESCE(service_started_at::time, time_in))) / 3600 > 24 THEN 'TOO LONG - REVIEW'
    ELSE 'OK'
  END as validation_status
FROM service_logs
WHERE total_hours IS NULL
  AND (
    (service_started_at IS NOT NULL AND service_ended_at IS NOT NULL)
    OR (time_in IS NOT NULL AND time_out IS NOT NULL)
  )
LIMIT 10;

-- ============================================================================
-- Step 2: Perform the backfill
-- ============================================================================

-- Update records with calculated total_hours from TIMESTAMPTZ fields
UPDATE service_logs
SET total_hours = EXTRACT(EPOCH FROM (service_ended_at - service_started_at)) / 3600
WHERE service_started_at IS NOT NULL
  AND service_ended_at IS NOT NULL
  AND total_hours IS NULL
  -- Safety check: only update if calculated value is reasonable
  AND EXTRACT(EPOCH FROM (service_ended_at - service_started_at)) / 3600 >= 0
  AND EXTRACT(EPOCH FROM (service_ended_at - service_started_at)) / 3600 <= 24;

-- Update records with calculated total_hours from TIME fields (Notion imports)
UPDATE service_logs
SET total_hours = EXTRACT(EPOCH FROM (time_out - time_in)) / 3600
WHERE time_in IS NOT NULL
  AND time_out IS NOT NULL
  AND total_hours IS NULL
  -- Safety check: only update if calculated value is reasonable
  AND EXTRACT(EPOCH FROM (time_out - time_in)) / 3600 >= 0
  AND EXTRACT(EPOCH FROM (time_out - time_in)) / 3600 <= 24;

-- ============================================================================
-- Step 3: Report on results
-- ============================================================================

-- Count updated records
SELECT COUNT(*) as records_updated
FROM service_logs
WHERE total_hours IS NOT NULL
  AND service_started_at IS NOT NULL
  AND service_ended_at IS NOT NULL;

-- Check for any edge cases that were not updated
SELECT
  id,
  boat_id,
  service_date,
  service_started_at,
  service_ended_at,
  total_hours,
  EXTRACT(EPOCH FROM (service_ended_at - service_started_at)) / 3600 as calculated_hours,
  'Out of range - requires manual review' as reason
FROM service_logs
WHERE service_started_at IS NOT NULL
  AND service_ended_at IS NOT NULL
  AND total_hours IS NULL;

-- ============================================================================
-- Step 4: Validation queries
-- ============================================================================

-- Verify data quality after backfill
SELECT
  COUNT(*) as total_service_logs,
  COUNT(*) FILTER (WHERE total_hours IS NOT NULL) as with_total_hours,
  COUNT(*) FILTER (WHERE total_hours IS NULL) as without_total_hours,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE total_hours IS NOT NULL) / COUNT(*),
    2
  ) as percent_with_hours,
  AVG(total_hours) as avg_hours,
  MIN(total_hours) as min_hours,
  MAX(total_hours) as max_hours
FROM service_logs;

-- Check distribution by data source
SELECT
  data_source,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE total_hours IS NOT NULL) as with_hours,
  ROUND(AVG(total_hours), 2) as avg_hours
FROM service_logs
GROUP BY data_source
ORDER BY total_records DESC;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Next steps:
-- 1. Review the validation queries above
-- 2. Check for any edge cases requiring manual intervention
-- 3. Verify that the views created in migration 023 now return data
