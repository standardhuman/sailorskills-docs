-- Update RLS policy to include customer-level invoices (Zoho invoices with boat_id = NULL)
-- Date: 2025-10-28
-- Purpose: Allow customers to see both boat-specific and customer-level invoices in the portal
-- Note: invoices.customer_id is TEXT, boats.customer_id is UUID, so we need to cast

-- Drop the old policy
DROP POLICY IF EXISTS "Allow customers to view invoices for their boats" ON invoices;
DROP POLICY IF EXISTS "Allow customers to view their invoices" ON invoices;

-- Create updated policy that includes:
-- 1. Boat-specific invoices (where boat_id matches customer's boats)
-- 2. Customer-level invoices (where boat_id is NULL and customer_id matches)
CREATE POLICY "Allow customers to view their invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
  -- Boat-specific invoices: customer has access to the boat
  boat_id IN (
    SELECT boat_id
    FROM customer_boat_access
    WHERE customer_account_id = auth.uid()
  )
  OR
  -- Customer-level invoices: boat_id is NULL and customer_id matches one of their boats' customer_id
  -- Cast boats.customer_id to text to match invoices.customer_id type
  (
    boat_id IS NULL
    AND customer_id IN (
      SELECT boats.customer_id::text
      FROM customer_boat_access
      JOIN boats ON customer_boat_access.boat_id = boats.id
      WHERE customer_boat_access.customer_account_id = auth.uid()
    )
  )
);

-- Verify the policy works
-- Test query (replace UUID with actual customer_account_id):
-- SET LOCAL role authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "your-auth-uid-here"}';
-- SELECT COUNT(*) FROM invoices;
