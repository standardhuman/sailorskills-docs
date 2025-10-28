-- Update transaction_details view to show boat names from linked service logs
-- Date: 2025-10-28
-- Purpose: Fix "Boat" column in billing transactions to show boat names for Zoho invoices
--
-- Issue: Zoho invoices have boat_details = {} (empty JSON) and boat_id = NULL
-- Solution: When boat_details is empty, get boat info from linked service_log's boat

CREATE OR REPLACE VIEW transaction_details AS
SELECT
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
  LEFT JOIN boats b ON b.id = sl.boat_id;

-- Verification query
-- SELECT
--   invoice_number,
--   customer_details->>'name' as customer,
--   boat_details->>'name' as boat,
--   CASE WHEN service_log_id IS NOT NULL THEN '✓ Linked' ELSE 'N/A' END as service
-- FROM transaction_details
-- WHERE invoice_number LIKE 'ZB-%'
-- ORDER BY issued_at DESC
-- LIMIT 10;
