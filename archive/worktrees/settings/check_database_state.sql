-- Check database state after migration 014

-- Count service_orders
SELECT 'service_orders count' as check_name, COUNT(*) as count
FROM service_orders;

-- Count boats
SELECT 'boats count' as check_name, COUNT(*) as count
FROM boats;

-- Check if replenishment_list exists and has data
SELECT 'replenishment_list count' as check_name, COUNT(*) as count
FROM replenishment_list;

-- Show recent service_orders if any
SELECT
  'Recent service_orders' as info,
  id,
  boat_id,
  scheduled_date,
  service_type,
  status,
  created_at
FROM service_orders
ORDER BY created_at DESC
LIMIT 5;

-- Show recent boats if any
SELECT
  'Recent boats' as info,
  id,
  customer_name,
  boat_name,
  is_active,
  created_at
FROM boats
ORDER BY created_at DESC
LIMIT 5;
