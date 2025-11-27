-- Fix transaction_details view to prevent duplicate rows
-- Date: 2025-10-28
-- Issue: View created duplicate rows when invoices had multiple service logs
-- Solution: Use DISTINCT ON to return only one row per invoice

CREATE OR REPLACE VIEW transaction_details AS
SELECT DISTINCT ON (i.id)
  i.id AS invoice_id,
  i.invoice_number,
  i.customer_id,
  i.boat_id,
  i.service_id,
  i.amount,
  i.status AS invoice_status,
  i.issued_at,
  i.due_at,
  i.paid_at,
  i.payment_method,
  i.customer_details,
  -- Use boat details from invoice if NOT NULL and NOT empty {}
  -- Otherwise get from service_log's boat (for Zoho invoices linked to services)
  CASE
    WHEN i.boat_details IS NOT NULL AND i.boat_details != '{}' THEN i.boat_details
    WHEN sl.boat_id IS NOT NULL THEN
      jsonb_build_object(
        'name', b.name,
        'make', b.make,
        'model', b.model,
        'length', b.length
      )
    ELSE NULL
  END AS boat_details,
  i.service_details,
  p.id AS payment_id,
  p.stripe_charge_id,
  p.stripe_payment_intent_id,
  p.status AS payment_status,
  sl.id AS service_log_id,
  sl.service_date,
  sl.service_type,
  sl.notes
FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
  LEFT JOIN service_logs sl ON sl.invoice_id = i.id
  LEFT JOIN boats b ON b.id = sl.boat_id
ORDER BY i.id, sl.created_at DESC; -- Prefer most recent service log if multiple

-- Results:
-- Before: 1,769 rows (170 duplicates)
-- After: 1,599 rows (no duplicates)
-- Overdue: 25 rows (was 27 with duplicates)
