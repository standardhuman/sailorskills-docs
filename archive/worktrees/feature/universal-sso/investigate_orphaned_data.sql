-- Find all orphaned service_orders
SELECT
  so.id,
  so.boat_id,
  so.scheduled_date,
  so.service_type,
  so.status,
  so.created_at,
  CASE
    WHEN b.id IS NULL THEN '❌ ORPHANED'
    ELSE '✅ VALID'
  END as status_check
FROM service_orders so
LEFT JOIN boats b ON so.boat_id = b.id
WHERE b.id IS NULL;
