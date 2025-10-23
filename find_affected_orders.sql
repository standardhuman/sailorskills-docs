-- Find service orders that are missing boat_id (affected by the bug)
-- Run this in Supabase SQL Editor to identify other customers needing backfill

SELECT
  so.id,
  so.order_number,
  so.created_at,
  so.service_type,
  so.status,
  c.name as customer_name,
  c.email as customer_email,
  c.phone as customer_phone,
  -- Extract boat info from service_details JSONB
  so.service_details->>'boatName' as boat_name_from_order,
  so.service_details->>'boatLength' as boat_length_from_order,
  so.service_details->>'boatType' as boat_type_from_order,
  so.service_details->>'hullType' as hull_type_from_order,
  -- Extract location info from service order fields
  so.dock,
  so.slip_number,
  m.name as marina_name,
  -- Show if customer already has boats
  (SELECT COUNT(*) FROM boats WHERE customer_id = c.id) as existing_boats_count
FROM service_orders so
LEFT JOIN customers c ON c.id = so.customer_id
LEFT JOIN marinas m ON m.id = so.marina_id
WHERE so.boat_id IS NULL  -- Missing boat reference
  AND so.service_type != 'Item Recovery'  -- Item Recovery intentionally has no boat
  AND so.created_at > '2025-10-01'  -- Check last month
ORDER BY so.created_at DESC;
