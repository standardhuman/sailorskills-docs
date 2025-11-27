-- Migration 026: Add staff access to customer_messages and service_requests
-- Date: 2025-11-06
-- Purpose: Allow staff users (owner/admin/viewer) to view all customer messages and service requests
--
-- Root Cause: Operations dashboard failed to load customer hub data because
-- RLS policies only allowed customer access, not staff access.
--
-- Pattern: Following the same pattern as service_logs table

-- Add staff SELECT policy for customer_messages
CREATE POLICY "Staff can view all customer messages"
ON customer_messages
FOR SELECT
TO public
USING (
  (get_user_metadata() ->> 'user_type') = 'staff'
  AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin', 'viewer'])
);

-- Add staff SELECT policy for service_requests
CREATE POLICY "Staff can view all service requests"
ON service_requests
FOR SELECT
TO public
USING (
  (get_user_metadata() ->> 'user_type') = 'staff'
  AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin', 'viewer'])
);

-- Add staff UPDATE policy for customer_messages (to mark as read)
CREATE POLICY "Staff can update customer messages"
ON customer_messages
FOR UPDATE
TO public
USING (
  (get_user_metadata() ->> 'user_type') = 'staff'
  AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin'])
);

-- Add staff UPDATE policy for service_requests (to change status)
CREATE POLICY "Staff can update service requests"
ON service_requests
FOR UPDATE
TO public
USING (
  (get_user_metadata() ->> 'user_type') = 'staff'
  AND get_user_role(auth.uid()) = ANY(ARRAY['owner', 'admin'])
);

-- Note: viewer role can only SELECT, not UPDATE
-- Note: These policies work alongside existing customer policies (users can still view their own data)
