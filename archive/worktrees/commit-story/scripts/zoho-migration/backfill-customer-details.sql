-- Backfill customer_details JSONB field for Zoho invoices
-- Date: 2025-10-28
-- Purpose: Populate customer_details (name, email) for all Zoho invoices that are missing it
-- This fixes the "Unknown" customer display in the admin billing dashboard

-- Update Zoho invoices with customer_details from the customers table
UPDATE invoices
SET customer_details = jsonb_build_object(
  'name', customers.name,
  'email', customers.email
)
FROM customers
WHERE
  invoices.invoice_number LIKE 'ZB-%'
  AND customers.id::text = invoices.customer_id
  AND (
    invoices.customer_details IS NULL
    OR invoices.customer_details = '{}'
    OR invoices.customer_details->>'name' IS NULL
  );

-- Verify the update
SELECT
  COUNT(*) as total_zoho_invoices,
  COUNT(*) FILTER (WHERE customer_details->>'name' IS NOT NULL) as with_customer_name,
  COUNT(*) FILTER (WHERE customer_details->>'name' IS NULL) as still_missing
FROM invoices
WHERE invoice_number LIKE 'ZB-%';
