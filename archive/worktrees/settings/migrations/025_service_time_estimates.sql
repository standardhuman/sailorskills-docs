-- Migration: Service Time Estimates
-- Date: 2025-11-06
-- Description: Create estimation system for missing service time data
-- Strategy: Per-boat averages for boats with partial data, global averages for boats with no data

-- ============================================================================
-- 1. Create estimation view for individual service logs
-- ============================================================================

CREATE OR REPLACE VIEW service_logs_with_estimates AS
SELECT
  sl.*,

  -- Calculate per-boat average (only from services with actual time data)
  (
    SELECT AVG(total_hours)
    FROM service_logs
    WHERE boat_id = sl.boat_id
      AND total_hours IS NOT NULL
  ) as boat_avg_hours,

  -- Calculate global average (fallback if boat has no time data)
  (
    SELECT AVG(total_hours)
    FROM service_logs
    WHERE total_hours IS NOT NULL
  ) as global_avg_hours,

  -- Determine estimated hours (use actual if available, otherwise boat avg, otherwise global avg)
  COALESCE(
    sl.total_hours,
    (SELECT AVG(total_hours) FROM service_logs WHERE boat_id = sl.boat_id AND total_hours IS NOT NULL),
    (SELECT AVG(total_hours) FROM service_logs WHERE total_hours IS NOT NULL)
  ) as estimated_hours,

  -- Flag to indicate if this is actual or estimated
  CASE
    WHEN sl.total_hours IS NOT NULL THEN 'actual'
    WHEN (SELECT COUNT(*) FROM service_logs WHERE boat_id = sl.boat_id AND total_hours IS NOT NULL) > 0 THEN 'boat_average'
    ELSE 'global_average'
  END as estimate_source

FROM service_logs sl;

COMMENT ON VIEW service_logs_with_estimates IS 'Service logs with estimated hours for missing data. Uses per-boat averages when available, global average as fallback. Check estimate_source column to see if data is actual or estimated.';

-- ============================================================================
-- 2. Create boat service estimates view (includes interpolated data)
-- ============================================================================

CREATE OR REPLACE VIEW boat_service_estimates AS
SELECT
  boat_id,

  -- Count all services (not just those with time data)
  COUNT(*) as total_services,

  -- Actual data metrics
  COUNT(*) FILTER (WHERE total_hours IS NOT NULL) as services_with_actual_time,
  SUM(total_hours) as total_actual_hours,
  AVG(total_hours) as avg_actual_hours,

  -- Estimated data metrics
  COUNT(*) FILTER (WHERE total_hours IS NULL) as services_with_estimated_time,
  SUM(estimated_hours) FILTER (WHERE total_hours IS NULL) as total_estimated_hours,

  -- Combined metrics (actual + estimated)
  SUM(estimated_hours) as total_hours_with_estimates,
  AVG(estimated_hours) as avg_hours_with_estimates,

  -- Data quality indicators
  ROUND(100.0 * COUNT(*) FILTER (WHERE total_hours IS NOT NULL) / COUNT(*), 2) as data_coverage_percent,

  -- Service date range
  MIN(service_date) as first_service_date,
  MAX(service_date) as last_service_date,

  -- Last service metrics
  (
    SELECT estimated_hours
    FROM service_logs_with_estimates
    WHERE boat_id = sle.boat_id
    ORDER BY service_date DESC
    LIMIT 1
  ) as last_service_duration_estimated,

  (
    SELECT estimate_source
    FROM service_logs_with_estimates
    WHERE boat_id = sle.boat_id
    ORDER BY service_date DESC
    LIMIT 1
  ) as last_service_estimate_source

FROM service_logs_with_estimates sle
GROUP BY boat_id;

COMMENT ON VIEW boat_service_estimates IS 'Per-boat service metrics including estimated hours for missing data. Shows both actual and estimated metrics separately, plus combined totals. Use for scheduling and planning.';

-- ============================================================================
-- 3. Create monthly service estimates view (for trends with estimates)
-- ============================================================================

CREATE OR REPLACE VIEW monthly_service_estimates AS
SELECT
  EXTRACT(YEAR FROM service_date)::INTEGER as year,
  EXTRACT(MONTH FROM service_date)::INTEGER as month,
  DATE_TRUNC('month', service_date)::DATE as month_start,

  -- All services in the month
  COUNT(*) as total_services,

  -- Actual data
  COUNT(*) FILTER (WHERE total_hours IS NOT NULL) as services_with_actual_time,
  SUM(total_hours) as total_actual_hours,
  AVG(total_hours) as avg_actual_hours,

  -- Estimated data
  COUNT(*) FILTER (WHERE total_hours IS NULL) as services_with_estimated_time,
  SUM(estimated_hours) FILTER (WHERE total_hours IS NULL) as total_estimated_hours,

  -- Combined metrics
  SUM(estimated_hours) as total_hours_with_estimates,
  AVG(estimated_hours) as avg_hours_with_estimates,

  -- Data quality
  ROUND(100.0 * COUNT(*) FILTER (WHERE total_hours IS NOT NULL) / COUNT(*), 2) as data_coverage_percent,

  -- Other metrics
  COUNT(DISTINCT boat_id) as unique_boats_serviced,
  COUNT(DISTINCT technician_id) as unique_technicians,
  MAX(estimated_hours) as longest_service_estimated,
  MIN(estimated_hours) as shortest_service_estimated

FROM service_logs_with_estimates
GROUP BY
  EXTRACT(YEAR FROM service_date),
  EXTRACT(MONTH FROM service_date),
  DATE_TRUNC('month', service_date)
ORDER BY year DESC, month DESC;

COMMENT ON VIEW monthly_service_estimates IS 'Monthly service metrics including estimated hours. Shows actual vs estimated breakdown. Use for trend analysis with complete data coverage.';

-- ============================================================================
-- 4. Create service type estimates view
-- ============================================================================

CREATE OR REPLACE VIEW service_type_estimates AS
SELECT
  -- Categorize by boat size
  CASE
    WHEN b.length < 30 THEN 'Under 30ft'
    WHEN b.length >= 30 AND b.length < 40 THEN '30-40ft'
    WHEN b.length >= 40 AND b.length < 50 THEN '40-50ft'
    WHEN b.length >= 50 THEN '50ft+'
    ELSE 'Unknown Size'
  END as boat_size_category,

  -- Service complexity
  CASE
    WHEN sle.notes IS NOT NULL AND LENGTH(sle.notes) > 100 THEN 'Complex'
    ELSE 'Routine'
  END as service_complexity,

  -- Service counts
  COUNT(*) as total_services,
  COUNT(*) FILTER (WHERE sle.total_hours IS NOT NULL) as services_with_actual_time,

  -- Actual metrics
  AVG(sle.total_hours) as avg_actual_hours,
  SUM(sle.total_hours) as total_actual_hours,

  -- Estimated metrics
  AVG(sle.estimated_hours) as avg_estimated_hours,
  SUM(sle.estimated_hours) as total_estimated_hours,

  -- Ranges
  MIN(sle.estimated_hours) as min_hours_estimated,
  MAX(sle.estimated_hours) as max_hours_estimated,
  STDDEV(sle.estimated_hours) as hours_stddev_estimated,

  -- Data quality
  ROUND(100.0 * COUNT(*) FILTER (WHERE sle.total_hours IS NOT NULL) / COUNT(*), 2) as data_coverage_percent

FROM service_logs_with_estimates sle
LEFT JOIN boats b ON b.id = sle.boat_id
GROUP BY
  boat_size_category,
  service_complexity
ORDER BY total_services DESC;

COMMENT ON VIEW service_type_estimates IS 'Service metrics by boat size and complexity including estimated hours. Use for pricing models and service time predictions.';

-- ============================================================================
-- 5. Create helper function for getting boat estimate
-- ============================================================================

CREATE OR REPLACE FUNCTION get_boat_service_estimate(p_boat_id UUID)
RETURNS TABLE (
  estimated_hours NUMERIC,
  estimate_source TEXT,
  confidence_level TEXT,
  data_points INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Estimated hours
    COALESCE(
      (SELECT AVG(total_hours) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL),
      (SELECT AVG(total_hours) FROM service_logs WHERE total_hours IS NOT NULL)
    ) as estimated_hours,

    -- Source of estimate
    CASE
      WHEN (SELECT COUNT(*) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL) >= 5 THEN 'boat_historical_data'
      WHEN (SELECT COUNT(*) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL) > 0 THEN 'boat_limited_data'
      ELSE 'global_average'
    END as estimate_source,

    -- Confidence level
    CASE
      WHEN (SELECT COUNT(*) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL) >= 5 THEN 'high'
      WHEN (SELECT COUNT(*) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL) >= 2 THEN 'medium'
      ELSE 'low'
    END as confidence_level,

    -- Number of data points used
    (SELECT COUNT(*) FROM service_logs WHERE boat_id = p_boat_id AND total_hours IS NOT NULL)::INTEGER as data_points;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_boat_service_estimate IS 'Get estimated service duration for a boat with confidence level. Returns boat average if available (high confidence with 5+ services), otherwise global average (low confidence).';

-- ============================================================================
-- 6. Example queries
-- ============================================================================

-- Example 1: Get boat estimate with confidence
-- SELECT * FROM get_boat_service_estimate('boat-id-here');

-- Example 2: Compare actual vs estimated metrics
-- SELECT
--   boat_id,
--   total_services,
--   services_with_actual_time,
--   services_with_estimated_time,
--   total_actual_hours,
--   total_estimated_hours,
--   total_hours_with_estimates,
--   data_coverage_percent
-- FROM boat_service_estimates
-- WHERE boat_id = 'boat-id-here';

-- Example 3: Find boats with low data coverage (need more time tracking)
-- SELECT
--   boat_id,
--   total_services,
--   data_coverage_percent,
--   avg_hours_with_estimates
-- FROM boat_service_estimates
-- WHERE data_coverage_percent < 50
-- ORDER BY total_services DESC;

-- Example 4: Monthly trends with estimates
-- SELECT
--   year,
--   month,
--   total_services,
--   data_coverage_percent,
--   avg_actual_hours,
--   avg_hours_with_estimates,
--   total_hours_with_estimates
-- FROM monthly_service_estimates
-- ORDER BY year DESC, month DESC
-- LIMIT 12;

-- ============================================================================
-- Migration Complete
-- ============================================================================
