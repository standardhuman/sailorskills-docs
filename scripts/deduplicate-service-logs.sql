-- Deduplicate Service Logs
-- Keeps the FIRST record for each boat_id + service_date combination
-- (First by created_at timestamp)

BEGIN;

-- Create temp table with IDs to keep (earliest created_at for each boat+date)
CREATE TEMP TABLE service_logs_to_keep AS
SELECT DISTINCT ON (boat_id, service_date) id
FROM service_logs
ORDER BY boat_id, service_date, created_at ASC;

-- Show what will be deleted
SELECT
  'BEFORE' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT boat_id) as boats_with_services
FROM service_logs;

SELECT
  'TO DELETE' as status,
  COUNT(*) as records_to_delete
FROM service_logs
WHERE id NOT IN (SELECT id FROM service_logs_to_keep);

SELECT
  'TO KEEP' as status,
  COUNT(*) as records_to_keep
FROM service_logs_to_keep;

-- Delete duplicates
DELETE FROM service_logs
WHERE id NOT IN (SELECT id FROM service_logs_to_keep);

-- Show final counts
SELECT
  'AFTER' as status,
  COUNT(*) as total_records,
  COUNT(DISTINCT boat_id) as boats_with_services
FROM service_logs;

COMMIT;
