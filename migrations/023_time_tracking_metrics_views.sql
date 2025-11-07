-- Migration: Time Tracking Metrics Views
-- Date: 2025-11-06
-- Description: Create database views for service time tracking metrics and efficiency analysis

-- ============================================================================
-- 1. Add database constraints for data quality
-- ============================================================================

-- Add check constraint for total_hours (must be non-negative and reasonable)
ALTER TABLE service_logs
ADD CONSTRAINT total_hours_reasonable
CHECK (total_hours IS NULL OR (total_hours >= 0 AND total_hours <= 24));

-- ============================================================================
-- 2. Create function to auto-calculate total_hours from timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- If both timestamps exist and total_hours is null, calculate it
  IF NEW.service_started_at IS NOT NULL
     AND NEW.service_ended_at IS NOT NULL
     AND NEW.total_hours IS NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.service_ended_at - NEW.service_started_at)) / 3600;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate total_hours on insert/update
DROP TRIGGER IF EXISTS auto_calculate_total_hours ON service_logs;
CREATE TRIGGER auto_calculate_total_hours
  BEFORE INSERT OR UPDATE ON service_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_hours();

-- ============================================================================
-- 3. Boat Service Metrics View
-- ============================================================================

CREATE OR REPLACE VIEW boat_service_metrics AS
SELECT
  boat_id,
  COUNT(*) as total_services,
  SUM(total_hours) as total_hours,
  AVG(total_hours) as avg_hours_per_service,
  MIN(service_date) as first_service_date,
  MAX(service_date) as last_service_date,
  MAX(total_hours) as max_service_duration,
  MIN(total_hours) as min_service_duration,
  -- Last service duration for recent context
  (
    SELECT total_hours
    FROM service_logs sl2
    WHERE sl2.boat_id = sl.boat_id
      AND sl2.total_hours IS NOT NULL
    ORDER BY sl2.service_date DESC
    LIMIT 1
  ) as last_service_duration
FROM service_logs sl
WHERE total_hours IS NOT NULL
GROUP BY boat_id;

-- Add comment explaining the view
COMMENT ON VIEW boat_service_metrics IS 'Aggregated service time metrics per boat, including totals, averages, and ranges. Used for boat history and detail displays.';

-- ============================================================================
-- 4. Technician Efficiency View
-- ============================================================================

CREATE OR REPLACE VIEW technician_efficiency AS
SELECT
  sl.technician_id,
  u.full_name as technician_name,
  -- All-time metrics
  COUNT(*) as services_completed,
  SUM(sl.total_hours) as total_hours_worked,
  AVG(sl.total_hours) as avg_service_duration,
  -- This month metrics
  COUNT(*) FILTER (
    WHERE DATE_TRUNC('month', sl.service_date) = DATE_TRUNC('month', CURRENT_DATE)
  ) as services_this_month,
  SUM(sl.total_hours) FILTER (
    WHERE DATE_TRUNC('month', sl.service_date) = DATE_TRUNC('month', CURRENT_DATE)
  ) as hours_this_month,
  AVG(sl.total_hours) FILTER (
    WHERE DATE_TRUNC('month', sl.service_date) = DATE_TRUNC('month', CURRENT_DATE)
  ) as avg_duration_this_month
FROM service_logs sl
LEFT JOIN users u ON u.id = sl.technician_id
WHERE sl.total_hours IS NOT NULL
GROUP BY sl.technician_id, u.full_name;

-- Add comment
COMMENT ON VIEW technician_efficiency IS 'Per-technician performance metrics including service counts, hours worked, and monthly comparisons. Sensitive data - access should be restricted to managers.';

-- ============================================================================
-- 5. Monthly Service Metrics View
-- ============================================================================

CREATE OR REPLACE VIEW monthly_service_metrics AS
SELECT
  EXTRACT(YEAR FROM service_date)::INTEGER as year,
  EXTRACT(MONTH FROM service_date)::INTEGER as month,
  DATE_TRUNC('month', service_date)::DATE as month_start,
  COUNT(*) as total_services,
  SUM(total_hours) as total_hours,
  AVG(total_hours) as avg_duration,
  COUNT(DISTINCT boat_id) as unique_boats_serviced,
  COUNT(DISTINCT technician_id) as unique_technicians,
  MAX(total_hours) as longest_service,
  MIN(total_hours) as shortest_service
FROM service_logs
WHERE total_hours IS NOT NULL
GROUP BY
  EXTRACT(YEAR FROM service_date),
  EXTRACT(MONTH FROM service_date),
  DATE_TRUNC('month', service_date)
ORDER BY year DESC, month DESC;

-- Add comment
COMMENT ON VIEW monthly_service_metrics IS 'Time-series aggregation of service metrics by month. Used for trend analysis and month-over-month comparisons.';

-- ============================================================================
-- 6. Service Type Efficiency View
-- ============================================================================

CREATE OR REPLACE VIEW service_type_efficiency AS
SELECT
  -- Categorize by boat size (using boat length from boats table)
  CASE
    WHEN b.length < 30 THEN 'Under 30ft'
    WHEN b.length >= 30 AND b.length < 40 THEN '30-40ft'
    WHEN b.length >= 40 AND b.length < 50 THEN '40-50ft'
    WHEN b.length >= 50 THEN '50ft+'
    ELSE 'Unknown Size'
  END as boat_size_category,

  -- Service complexity (based on presence of issues/notes)
  CASE
    WHEN sl.notes IS NOT NULL AND LENGTH(sl.notes) > 100 THEN 'Complex'
    ELSE 'Routine'
  END as service_complexity,

  -- Aggregated metrics
  COUNT(*) as service_count,
  AVG(sl.total_hours) as avg_hours,
  SUM(sl.total_hours) as total_hours,
  MIN(sl.total_hours) as min_hours,
  MAX(sl.total_hours) as max_hours,
  STDDEV(sl.total_hours) as hours_stddev

FROM service_logs sl
LEFT JOIN boats b ON b.id = sl.boat_id
WHERE sl.total_hours IS NOT NULL
GROUP BY
  boat_size_category,
  service_complexity
ORDER BY boat_size_category, service_complexity;

-- Add comment
COMMENT ON VIEW service_type_efficiency IS 'Service metrics categorized by boat size and service complexity. Used for identifying patterns and improving estimates.';

-- ============================================================================
-- 7. Create materialized views for performance (optional - can enable later)
-- ============================================================================

-- Note: Regular views should be fast enough for current data volumes.
-- If performance becomes an issue, convert to materialized views:
--
-- CREATE MATERIALIZED VIEW boat_service_metrics_mat AS
-- SELECT * FROM boat_service_metrics;
--
-- CREATE OR REPLACE FUNCTION refresh_service_metrics()
-- RETURNS void AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW boat_service_metrics_mat;
--   -- Add other materialized views here
-- END;
-- $$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. Grant permissions (assuming standard RLS setup)
-- ============================================================================

-- Views should inherit permissions from underlying tables (service_logs, boats, users)
-- No additional grants needed if RLS is properly configured

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verification queries (run these to test):
-- SELECT * FROM boat_service_metrics LIMIT 5;
-- SELECT * FROM technician_efficiency;
-- SELECT * FROM monthly_service_metrics LIMIT 12;
-- SELECT * FROM service_type_efficiency;
