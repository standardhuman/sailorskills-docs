-- Migration 023: Populate last_service in boats table
-- Date: 2025-11-05
-- Purpose: Calculate and populate boats.last_service from service_logs
--
-- Problem: boats.last_service column is empty (NULL) for all boats
--          This breaks forecast display of "Last Service" column
--
-- Solution: Update boats.last_service with MAX(service_date) from service_logs

-- Update last_service for all boats that have service logs
UPDATE boats b
SET last_service = (
  SELECT MAX(sl.service_date)
  FROM service_logs sl
  WHERE sl.boat_id = b.id
)
WHERE EXISTS (
  SELECT 1
  FROM service_logs sl
  WHERE sl.boat_id = b.id
);

-- Verify results
SELECT
  COUNT(*) FILTER (WHERE last_service IS NOT NULL) as boats_with_last_service,
  COUNT(*) FILTER (WHERE last_service IS NULL) as boats_without_last_service,
  COUNT(*) as total_boats
FROM boats
WHERE is_active = true;

-- Show sample boats with updated last_service
SELECT
  name,
  last_service,
  (SELECT MAX(service_date) FROM service_logs WHERE boat_id = boats.id) as verified_last_service
FROM boats
WHERE last_service IS NOT NULL
ORDER BY last_service DESC
LIMIT 10;
